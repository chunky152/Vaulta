import { prisma } from '../config/database.js';
import { StorageLocation, Prisma } from '@prisma/client';
import { LocationWithDistance } from '../types/index.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 300; // 5 minutes

interface NearbySearchOptions {
  latitude: number;
  longitude: number;
  radiusKm: number;
  page: number;
  limit: number;
  includeInactive?: boolean;
}

interface LocationWithAvailability extends LocationWithDistance {
  availableUnits: number;
  totalUnits: number;
}

export class GeolocationService {
  // Find locations near a point using PostGIS
  async findNearbyLocations(
    options: NearbySearchOptions
  ): Promise<{ locations: LocationWithDistance[]; total: number }> {
    const { latitude, longitude, radiusKm, page, limit, includeInactive = false } = options;
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = `nearby:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}:${page}:${limit}`;
    const cached = await cache.get<{ locations: LocationWithDistance[]; total: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use raw SQL for PostGIS distance calculation
    const locations = await prisma.$queryRaw<
      (StorageLocation & { distance: number })[]
    >`
      SELECT
        id,
        name,
        slug,
        description,
        address,
        city,
        state,
        country,
        latitude,
        longitude,
        operating_hours as "operatingHours",
        images,
        amenities,
        rating,
        review_count as "reviewCount",
        is_active as "isActive",
        is_featured as "isFeatured",
        created_at as "createdAt",
        updated_at as "updatedAt",
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography
        ) / 1000 as distance
      FROM storage_locations
      WHERE
        ${includeInactive ? Prisma.sql`TRUE` : Prisma.sql`is_active = true`}
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
      ORDER BY distance ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM storage_locations
      WHERE
        ${includeInactive ? Prisma.sql`TRUE` : Prisma.sql`is_active = true`}
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
    `;

    const total = Number(countResult[0]?.count ?? 0);

    const result = {
      locations: locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        slug: loc.slug,
        description: loc.description,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        distance: Math.round(loc.distance * 100) / 100, // Round to 2 decimals
        operatingHours: loc.operatingHours as Record<string, unknown>,
        images: loc.images as string[],
        amenities: loc.amenities as string[],
        rating: loc.rating,
        reviewCount: loc.reviewCount,
      })),
      total,
    };

    // Cache the result
    await cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  // Find nearby locations with availability info
  async findNearbyWithAvailability(
    options: NearbySearchOptions,
    startTime: Date,
    endTime: Date
  ): Promise<{ locations: LocationWithAvailability[]; total: number }> {
    const { locations, total } = await this.findNearbyLocations(options);

    // Get availability for each location
    const locationsWithAvailability = await Promise.all(
      locations.map(async (location) => {
        const units = await prisma.storageUnit.findMany({
          where: {
            locationId: location.id,
            isActive: true,
          },
          select: {
            id: true,
            status: true,
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'ACTIVE'] },
                OR: [
                  {
                    startTime: { lte: endTime },
                    endTime: { gte: startTime },
                  },
                ],
              },
              select: { id: true },
            },
          },
        });

        const totalUnits = units.length;
        const availableUnits = units.filter(
          (unit) =>
            unit.status === 'AVAILABLE' && unit.bookings.length === 0
        ).length;

        return {
          ...location,
          totalUnits,
          availableUnits,
        };
      })
    );

    return {
      locations: locationsWithAvailability,
      total,
    };
  }

  // Get locations by city
  async getLocationsByCity(
    city: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ locations: StorageLocation[]; total: number }> {
    const [locations, total] = await Promise.all([
      prisma.storageLocation.findMany({
        where: {
          city: { contains: city, mode: 'insensitive' },
          isActive: true,
        },
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storageLocation.count({
        where: {
          city: { contains: city, mode: 'insensitive' },
          isActive: true,
        },
      }),
    ]);

    return { locations, total };
  }

  // Get featured locations
  async getFeaturedLocations(limit: number = 10): Promise<StorageLocation[]> {
    const cacheKey = `featured_locations:${limit}`;
    const cached = await cache.get<StorageLocation[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const locations = await prisma.storageLocation.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });

    await cache.set(cacheKey, locations, CACHE_TTL);

    return locations;
  }

  // Calculate distance between two points
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get bounding box for a radius around a point
  getBoundingBox(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const latDelta = radiusKm / 111.32;
    const lonDelta = radiusKm / (111.32 * Math.cos(this.toRad(latitude)));

    return {
      minLat: latitude - latDelta,
      maxLat: latitude + latDelta,
      minLon: longitude - lonDelta,
      maxLon: longitude + lonDelta,
    };
  }
}

export const geolocationService = new GeolocationService();
