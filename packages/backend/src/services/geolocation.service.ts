import { StorageLocation } from '../models/StorageLocation.js';
import { StorageUnit } from '../models/StorageUnit.js';
import mongoose from 'mongoose';
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
  // Find locations near a point using MongoDB geospatial queries
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

    // Use MongoDB $geoNear aggregation pipeline
    const locations = await (StorageLocation.collection as any).aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusKm * 1000,
          query: includeInactive ? {} : { isActive: true },
        },
      },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          id: '$_id',
          name: 1,
          slug: 1,
          description: 1,
          address: 1,
          city: 1,
          state: 1,
          country: 1,
          latitude: 1,
          longitude: 1,
          operatingHours: 1,
          images: 1,
          amenities: 1,
          rating: 1,
          reviewCount: 1,
          isActive: 1,
          isFeatured: 1,
          createdAt: 1,
          updatedAt: 1,
          distance: 1,
        },
      },
    ]).toArray();

    // Get total count
    const countResult = await (StorageLocation.collection as any).aggregate([
      { $match: includeInactive ? {} : { isActive: true } },
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusKm * 1000,
        },
      },
      { $count: 'count' },
    ]).toArray();

    const total = countResult.length > 0 ? countResult[0].count : 0;

    const result = {
      locations: locations.map((loc: any) => ({
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
        distance: Math.round(loc.distance / 1000 * 100) / 100, // distance is in meters; convert to km and round
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
        const units = await StorageUnit.find({
          locationId: location.id,
          isActive: true,
        }).populate({
          path: 'bookings',
          match: {
            status: { $in: ['CONFIRMED', 'ACTIVE'] },
            $or: [
              {
                startTime: { $lte: endTime },
                endTime: { $gte: startTime },
              },
            ],
          },
          select: 'id',
        });

        const totalUnits = units.length;
        const availableUnits = units.filter(
          (unit) =>
            (unit as any).status === 'AVAILABLE' && (unit as any).bookings.length === 0
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
  ): Promise<{ locations: any[]; total: number }> {
    const [locations, total] = await Promise.all([
      StorageLocation.find({
        city: { $regex: city, $options: 'i' },
        isActive: true,
      })
        .sort({ rating: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StorageLocation.countDocuments({
        city: { $regex: city, $options: 'i' },
        isActive: true,
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

    const locations = await StorageLocation.find({
      isActive: true,
      isFeatured: true,
    })
      .sort({ rating: -1 })
      .limit(limit);

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
