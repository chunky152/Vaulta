import { StorageLocation } from '../models/StorageLocation.js';
import { StorageUnit } from '../models/StorageUnit.js';
import { Booking } from '../models/Booking.js';
import mongoose from 'mongoose';

import { NotFoundError, ConflictError } from '../types/index.js';
import { generateSlug } from '../utils/helpers.js';
import {
  CreateLocationInput,
  UpdateLocationInput,
  LocationListInput,
} from '../validators/location.validator.js';

export class LocationService {
  // Create a new storage location
  async createLocation(input: CreateLocationInput): Promise<any> {
    // Generate slug
    let slug = generateSlug(input.name);

    // Check if slug exists and make unique if needed
    let slugExists = await StorageLocation.findOne({ slug });

    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(input.name)}-${counter}`;
      slugExists = await StorageLocation.findOne({ slug });
      counter++;
    }

    const location = await StorageLocation.create({
      ...input,
      slug,
      operatingHours: input.operatingHours ?? {},
      images: input.images ?? [],
      amenities: input.amenities ?? [],
    });

    return location;
  }

  // Get location by ID
  async getLocationById(id: string): Promise<any> {
    const location = await StorageLocation.findById(id);

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    return location;
  }

  // Get location by slug
  async getLocationBySlug(slug: string): Promise<any> {
    const location = await StorageLocation.findOne({ slug });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    return location;
  }

  // List locations with filters
  async listLocations(
    input: LocationListInput
  ): Promise<{ locations: any[]; total: number; totalPages: number }> {
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

    const query: any = {};

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const [locations, total] = await Promise.all([
      StorageLocation.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StorageLocation.countDocuments(query),
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
  ): Promise<any> {
    // Check if location exists
    const existing = await StorageLocation.findById(id);

    if (!existing) {
      throw new NotFoundError('Storage location');
    }

    // If name is changing, generate new slug
    let slug = existing.slug;
    if (input.name && input.name !== existing.name) {
      slug = generateSlug(input.name);

      const slugExists = await StorageLocation.findOne({ 
        slug, 
        _id: { $ne: id } 
      });

      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const location = await StorageLocation.findByIdAndUpdate(
      id,
      {
        ...input,
        slug,
      },
      { new: true }
    );

    return location;
  }

  // Delete location (soft delete by setting isActive to false)
  async deleteLocation(id: string): Promise<void> {
    const location = await StorageLocation.findById(id).populate({
      path: 'units',
      match: { isActive: true },
      populate: {
        path: 'bookings',
        match: { status: { $in: ['CONFIRMED', 'ACTIVE'] } },
      },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    const units = (location as any).units || [];
    if (units.length > 0) {
      throw new ConflictError(
        'Cannot delete location with active bookings'
      );
    }

    await StorageLocation.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  // Get location with units
  async getLocationWithUnits(id: string): Promise<any> {
    const location = await StorageLocation.findById(id).populate({
      path: 'units',
      match: { isActive: true },
      select: 'id unitNumber size status basePriceHourly basePriceDaily',
      options: { sort: { unitNumber: 1 } },
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
    const locationId = new mongoose.Types.ObjectId(id);
    
    const location = await StorageLocation.findById(id);

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    // Get unit stats by status
    const unitStats = await StorageUnit.aggregate([
      { $match: { locationId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get booking stats
    const bookingStats = await Booking.aggregate([
      {
        $lookup: {
          from: 'storageunits',
          localField: 'unitId',
          foreignField: '_id',
          as: 'unit',
        },
      },
      {
        $match: {
          'unit.locationId': locationId,
        },
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
    ]);

    // Get active bookings count
    const activeBookingCount = await Booking.countDocuments({
      status: 'ACTIVE',
      unitId: {
        $in: await StorageUnit.find({ locationId }).select('_id'),
      },
    });

    // Build status counts
    const statusCounts: Record<string, number> = {};
    unitStats.forEach((stat: any) => {
      statusCounts[stat._id] = stat.count;
    });

    const totalUnits = Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0);
    const availableUnits = statusCounts['AVAILABLE'] ?? 0;
    const occupiedUnits = statusCounts['OCCUPIED'] ?? 0;
    const maintenanceUnits = statusCounts['MAINTENANCE'] ?? 0;

    const bookingData = bookingStats[0] || { totalBookings: 0, totalRevenue: 0 };

    return {
      totalUnits,
      availableUnits,
      occupiedUnits,
      maintenanceUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      totalBookings: bookingData.totalBookings,
      activeBookings: activeBookingCount,
      totalRevenue: bookingData.totalRevenue ?? 0,
    };
  }

  // Update location rating (called after new review)
  async updateRating(locationId: string): Promise<void> {
    const { Review } = await import('../models/Review.js');
    
    const result = await Review.aggregate([
      { $match: { locationId: new mongoose.Types.ObjectId(locationId), isPublic: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const rating = result[0]?.avgRating ?? 0;
    const count = result[0]?.count ?? 0;

    await StorageLocation.findByIdAndUpdate(
      locationId,
      {
        rating,
        reviewCount: count,
      },
      { new: true }
    );
  }
}

export const locationService = new LocationService();
