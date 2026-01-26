import { prisma } from '../config/database.js';
import { StorageLocation, Prisma } from '@prisma/client';
import { cache } from '../config/redis.js';
import { NotFoundError, ConflictError } from '../types/index.js';
import { generateSlug } from '../utils/helpers.js';
import {
  CreateLocationInput,
  UpdateLocationInput,
  LocationListInput,
} from '../validators/location.validator.js';

const CACHE_TTL = 300; // 5 minutes

export class LocationService {
  // Create a new storage location
  async createLocation(input: CreateLocationInput): Promise<StorageLocation> {
    // Generate slug
    let slug = generateSlug(input.name);

    // Check if slug exists and make unique if needed
    let slugExists = await prisma.storageLocation.findUnique({
      where: { slug },
    });

    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(input.name)}-${counter}`;
      slugExists = await prisma.storageLocation.findUnique({
        where: { slug },
      });
      counter++;
    }

    const location = await prisma.storageLocation.create({
      data: {
        ...input,
        slug,
        operatingHours: input.operatingHours ?? {},
        images: input.images ?? [],
        amenities: input.amenities ?? [],
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return location;
  }

  // Get location by ID
  async getLocationById(id: string): Promise<StorageLocation> {
    const cacheKey = `location:${id}`;
    const cached = await cache.get<StorageLocation>(cacheKey);
    if (cached) {
      return cached;
    }

    const location = await prisma.storageLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    await cache.set(cacheKey, location, CACHE_TTL);

    return location;
  }

  // Get location by slug
  async getLocationBySlug(slug: string): Promise<StorageLocation> {
    const cacheKey = `location:slug:${slug}`;
    const cached = await cache.get<StorageLocation>(cacheKey);
    if (cached) {
      return cached;
    }

    const location = await prisma.storageLocation.findUnique({
      where: { slug },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    await cache.set(cacheKey, location, CACHE_TTL);

    return location;
  }

  // List locations with filters
  async listLocations(
    input: LocationListInput
  ): Promise<{ locations: StorageLocation[]; total: number; totalPages: number }> {
    const {
      city,
      country,
      isActive,
      isFeatured,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = input;

    const where: Prisma.StorageLocationWhereInput = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.storageLocation.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storageLocation.count({ where }),
    ]);

    return {
      locations,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update location
  async updateLocation(
    id: string,
    input: UpdateLocationInput
  ): Promise<StorageLocation> {
    // Check if location exists
    const existing = await prisma.storageLocation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Storage location');
    }

    // If name is changing, generate new slug
    let slug = existing.slug;
    if (input.name && input.name !== existing.name) {
      slug = generateSlug(input.name);

      const slugExists = await prisma.storageLocation.findFirst({
        where: { slug, id: { not: id } },
      });

      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const location = await prisma.storageLocation.update({
      where: { id },
      data: {
        ...input,
        slug,
      },
    });

    // Invalidate cache
    await this.invalidateCache(id);
    await cache.del(`location:slug:${existing.slug}`);

    return location;
  }

  // Delete location (soft delete by setting isActive to false)
  async deleteLocation(id: string): Promise<void> {
    const location = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        units: {
          where: {
            bookings: {
              some: {
                status: { in: ['CONFIRMED', 'ACTIVE'] },
              },
            },
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    if (location.units.length > 0) {
      throw new ConflictError(
        'Cannot delete location with active bookings'
      );
    }

    await prisma.storageLocation.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache(id);
  }

  // Get location with units
  async getLocationWithUnits(id: string): Promise<
    StorageLocation & {
      units: {
        id: string;
        unitNumber: string;
        size: string;
        status: string;
        basePriceHourly: number;
        basePriceDaily: number;
      }[];
    }
  > {
    const location = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        units: {
          where: { isActive: true },
          select: {
            id: true,
            unitNumber: true,
            size: true,
            status: true,
            basePriceHourly: true,
            basePriceDaily: true,
          },
          orderBy: { unitNumber: 'asc' },
        },
      },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    return location;
  }

  // Get location stats
  async getLocationStats(id: string): Promise<{
    totalUnits: number;
    availableUnits: number;
    occupiedUnits: number;
    maintenanceUnits: number;
    occupancyRate: number;
    totalBookings: number;
    activeBookings: number;
    totalRevenue: number;
  }> {
    const location = await prisma.storageLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    const [unitStats, bookingStats] = await Promise.all([
      prisma.storageUnit.groupBy({
        by: ['status'],
        where: { locationId: id, isActive: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: {
          unit: { locationId: id },
        },
        _count: true,
        _sum: { totalPrice: true },
      }),
    ]);

    const activeBookings = await prisma.booking.count({
      where: {
        unit: { locationId: id },
        status: 'ACTIVE',
      },
    });

    const statusCounts = unitStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalUnits = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const availableUnits = statusCounts['AVAILABLE'] ?? 0;
    const occupiedUnits = statusCounts['OCCUPIED'] ?? 0;
    const maintenanceUnits = statusCounts['MAINTENANCE'] ?? 0;

    return {
      totalUnits,
      availableUnits,
      occupiedUnits,
      maintenanceUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      totalBookings: bookingStats._count,
      activeBookings,
      totalRevenue: bookingStats._sum.totalPrice ?? 0,
    };
  }

  // Update location rating (called after new review)
  async updateRating(locationId: string): Promise<void> {
    const result = await prisma.review.aggregate({
      where: { locationId, isPublic: true },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.storageLocation.update({
      where: { id: locationId },
      data: {
        rating: result._avg.rating ?? 0,
        reviewCount: result._count,
      },
    });

    await this.invalidateCache(locationId);
  }

  // Invalidate location cache
  private async invalidateCache(id?: string): Promise<void> {
    if (id) {
      await cache.del(`location:${id}`);
    }
    // Could also invalidate list caches, featured locations, etc.
  }
}

export const locationService = new LocationService();
