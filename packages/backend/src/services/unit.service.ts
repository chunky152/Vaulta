import { StorageUnit, UnitStatus } from '../models/StorageUnit.js';
import { StorageLocation } from '../models/StorageLocation.js';
import { Booking } from '../models/Booking.js';
import mongoose from 'mongoose';
import { NotFoundError, ConflictError } from '../types/index.js';
import { generateUnitQRCode } from '../utils/qrcode.js';
import {
  CreateUnitInput,
  UpdateUnitInput,
  UnitSearchInput,
} from '../validators/unit.validator.js';

export class UnitService {
  // Create a new storage unit
  async createUnit(input: CreateUnitInput): Promise<any> {
    // Verify location exists
    const location = await StorageLocation.findById(input.locationId);

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    // Check if unit number already exists at this location
    const existingUnit = await StorageUnit.findOne({
      locationId: input.locationId,
      unitNumber: input.unitNumber,
    });

    if (existingUnit) {
      throw new ConflictError(
        `Unit ${input.unitNumber} already exists at this location`
      );
    }

    // Generate QR code
    const qrCode = generateUnitQRCode(input.unitNumber, input.locationId);

    const unit = await StorageUnit.create({
      ...input,
      dimensions: input.dimensions ?? {},
      features: input.features ?? [],
      qrCode,
    });

    return unit;
  }

  // Create multiple units at once
  async createBulkUnits(
    locationId: string,
    units: Omit<CreateUnitInput, 'locationId'>[]
  ): Promise<any[]> {
    // Verify location exists
    const location = await StorageLocation.findById(locationId);

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    // Check for duplicate unit numbers within the batch
    const unitNumbers = units.map((u) => u.unitNumber);
    const uniqueNumbers = new Set(unitNumbers);
    if (uniqueNumbers.size !== unitNumbers.length) {
      throw new ConflictError('Duplicate unit numbers in batch');
    }

    // Check for existing units
    const existingUnits = await StorageUnit.find({
      locationId,
      unitNumber: { $in: unitNumbers },
    }).select('unitNumber');

    if (existingUnits.length > 0) {
      const existingNumbers = existingUnits.map((u) => u.unitNumber).join(', ');
      throw new ConflictError(
        `Units already exist: ${existingNumbers}`
      );
    }

    // Create all units
    const createdUnits = await StorageUnit.insertMany(
      units.map((unit) => ({
        ...unit,
        locationId,
        dimensions: unit.dimensions ?? {},
        features: unit.features ?? [],
        qrCode: generateUnitQRCode(unit.unitNumber, locationId),
      }))
    );

    return createdUnits;
  }

  // Get unit by ID
  async getUnitById(id: string): Promise<any> {
    const unit = await StorageUnit.findById(id).populate({
      path: 'locationId',
      select: 'id name address city',
    });

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    return unit;
  }

  // List units with filters
  async listUnits(
    input: UnitSearchInput
  ): Promise<{ units: any[]; total: number; totalPages: number }> {
    const {
      locationId,
      size,
      status,
      minPriceHourly,
      maxPriceHourly,
      minPriceDaily,
      maxPriceDaily,
      features,
      isActive,
      sortBy,
      sortOrder,
      page,
      limit,
    } = input;

    const query: any = {};

    if (locationId) {
      query.locationId = locationId;
    }

    if (size) {
      query.size = size;
    }

    if (status) {
      query.status = status;
    }

    if (minPriceHourly !== undefined || maxPriceHourly !== undefined) {
      query.basePriceHourly = {};
      if (minPriceHourly !== undefined) {
        query.basePriceHourly.$gte = minPriceHourly;
      }
      if (maxPriceHourly !== undefined) {
        query.basePriceHourly.$lte = maxPriceHourly;
      }
    }

    if (minPriceDaily !== undefined || maxPriceDaily !== undefined) {
      query.basePriceDaily = {};
      if (minPriceDaily !== undefined) {
        query.basePriceDaily.$gte = minPriceDaily;
      }
      if (maxPriceDaily !== undefined) {
        query.basePriceDaily.$lte = maxPriceDaily;
      }
    }

    if (features && features.length > 0) {
      query.features = { $all: features };
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [units, total] = await Promise.all([
      StorageUnit.find(query)
        .populate({
          path: 'locationId',
          select: 'id name address city',
        })
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StorageUnit.countDocuments(query),
    ]);

    return {
      units,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update unit
  async updateUnit(id: string, input: UpdateUnitInput): Promise<any> {
    const existing = await StorageUnit.findById(id);

    if (!existing) {
      throw new NotFoundError('Storage unit');
    }

    // If updating unit number, check for conflicts
    if (input.unitNumber && input.unitNumber !== existing.unitNumber) {
      const conflict = await StorageUnit.findOne({
        locationId: existing.locationId,
        unitNumber: input.unitNumber,
      });

      if (conflict) {
        throw new ConflictError(
          `Unit ${input.unitNumber} already exists at this location`
        );
      }
    }

    const unit = await StorageUnit.findByIdAndUpdate(id, input, { new: true });

    return unit;
  }

  // Update unit status
  async updateStatus(id: string, status: UnitStatus): Promise<any> {
    const existing = (await StorageUnit.findById(id).populate({
      path: 'bookings',
      match: { status: { $in: ['CONFIRMED', 'ACTIVE'] } },
    })) as any;

    if (!existing) {
      throw new NotFoundError('Storage unit');
    }

    // Don't allow setting to AVAILABLE if there are active bookings
    if (status === 'AVAILABLE' && existing.bookings?.length > 0) {
      throw new ConflictError(
        'Cannot set status to AVAILABLE while there are active bookings'
      );
    }

    const unit = await StorageUnit.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    return unit;
  }

  // Delete unit (soft delete)
  async deleteUnit(id: string): Promise<void> {
    const unit = (await StorageUnit.findById(id).populate({
      path: 'bookings',
      match: { status: { $in: ['CONFIRMED', 'ACTIVE'] } },
    })) as any;

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    if (unit.bookings?.length > 0) {
      throw new ConflictError(
        'Cannot delete unit with active bookings'
      );
    }

    await StorageUnit.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  // Check unit availability for a time period
  async checkAvailability(
    unitId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    available: boolean;
    conflicts: { bookingId: string; startTime: Date; endTime: Date }[];
  }> {
    const unit = await StorageUnit.findById(unitId);

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    if (!unit.isActive || unit.status === 'MAINTENANCE') {
      return {
        available: false,
        conflicts: [],
      };
    }

    // Find overlapping bookings
    const conflictingBookings = await Booking.find({
      unitId,
      status: { $in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
      $or: [
        {
          startTime: { $lte: endTime },
          endTime: { $gte: startTime },
        },
      ],
    }).select('id startTime endTime');

    return {
      available: conflictingBookings.length === 0,
      conflicts: conflictingBookings.map((b) => ({
        bookingId: b._id.toString(),
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    };
  }

  // Get available units at a location for a time period
  async getAvailableUnits(
    locationId: string,
    startTime: Date,
    endTime: Date,
    size?: string
  ): Promise<any[]> {
    const query: any = {
      locationId,
      isActive: true,
      status: 'AVAILABLE',
    };

    if (size) {
      query.size = size;
    }

    // Find units with no conflicting bookings
    const units = await StorageUnit.find(query)
      .sort({ basePriceHourly: 1 });

    // Filter out units with overlapping bookings
    const availableUnits = [];
    for (const unit of units) {
      const conflicts = await Booking.countDocuments({
        unitId: unit._id,
        status: { $in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        $or: [
          {
            startTime: { $lte: endTime },
            endTime: { $gte: startTime },
          },
        ],
      });

      if (conflicts === 0) {
        availableUnits.push(unit);
      }
    }

    return availableUnits;
  }
}

export const unitService = new UnitService();
