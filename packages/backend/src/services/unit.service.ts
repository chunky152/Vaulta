import { prisma } from '../config/database.js';
import { StorageUnit, UnitStatus, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../types/index.js';
import { generateUnitQRCode } from '../utils/qrcode.js';
import {
  CreateUnitInput,
  UpdateUnitInput,
  UnitSearchInput,
} from '../validators/unit.validator.js';

export class UnitService {
  // Create a new storage unit
  async createUnit(input: CreateUnitInput): Promise<StorageUnit> {
    // Verify location exists
    const location = await prisma.storageLocation.findUnique({
      where: { id: input.locationId },
    });

    if (!location) {
      throw new NotFoundError('Storage location');
    }

    // Check if unit number already exists at this location
    const existingUnit = await prisma.storageUnit.findUnique({
      where: {
        locationId_unitNumber: {
          locationId: input.locationId,
          unitNumber: input.unitNumber,
        },
      },
    });

    if (existingUnit) {
      throw new ConflictError(
        `Unit ${input.unitNumber} already exists at this location`
      );
    }

    // Generate QR code
    const qrCode = generateUnitQRCode(input.unitNumber, input.locationId);

    const unit = await prisma.storageUnit.create({
      data: {
        ...input,
        dimensions: input.dimensions ?? {},
        features: input.features ?? [],
        qrCode,
      },
    });

    return unit;
  }

  // Create multiple units at once
  async createBulkUnits(
    locationId: string,
    units: Omit<CreateUnitInput, 'locationId'>[]
  ): Promise<StorageUnit[]> {
    // Verify location exists
    const location = await prisma.storageLocation.findUnique({
      where: { id: locationId },
    });

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
    const existingUnits = await prisma.storageUnit.findMany({
      where: {
        locationId,
        unitNumber: { in: unitNumbers },
      },
      select: { unitNumber: true },
    });

    if (existingUnits.length > 0) {
      const existingNumbers = existingUnits.map((u) => u.unitNumber).join(', ');
      throw new ConflictError(
        `Units already exist: ${existingNumbers}`
      );
    }

    // Create all units
    const createdUnits = await prisma.$transaction(
      units.map((unit) =>
        prisma.storageUnit.create({
          data: {
            ...unit,
            locationId,
            dimensions: unit.dimensions ?? {},
            features: unit.features ?? [],
            qrCode: generateUnitQRCode(unit.unitNumber, locationId),
          },
        })
      )
    );

    return createdUnits;
  }

  // Get unit by ID
  async getUnitById(id: string): Promise<StorageUnit> {
    const unit = await prisma.storageUnit.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    return unit;
  }

  // List units with filters
  async listUnits(
    input: UnitSearchInput
  ): Promise<{ units: StorageUnit[]; total: number; totalPages: number }> {
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

    const where: Prisma.StorageUnitWhereInput = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (size) {
      where.size = size;
    }

    if (status) {
      where.status = status;
    }

    if (minPriceHourly !== undefined || maxPriceHourly !== undefined) {
      where.basePriceHourly = {};
      if (minPriceHourly !== undefined) {
        where.basePriceHourly.gte = minPriceHourly;
      }
      if (maxPriceHourly !== undefined) {
        where.basePriceHourly.lte = maxPriceHourly;
      }
    }

    if (minPriceDaily !== undefined || maxPriceDaily !== undefined) {
      where.basePriceDaily = {};
      if (minPriceDaily !== undefined) {
        where.basePriceDaily.gte = minPriceDaily;
      }
      if (maxPriceDaily !== undefined) {
        where.basePriceDaily.lte = maxPriceDaily;
      }
    }

    if (features && features.length > 0) {
      where.features = {
        hasEvery: features,
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [units, total] = await Promise.all([
      prisma.storageUnit.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storageUnit.count({ where }),
    ]);

    return {
      units,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update unit
  async updateUnit(id: string, input: UpdateUnitInput): Promise<StorageUnit> {
    const existing = await prisma.storageUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Storage unit');
    }

    // If updating unit number, check for conflicts
    if (input.unitNumber && input.unitNumber !== existing.unitNumber) {
      const conflict = await prisma.storageUnit.findUnique({
        where: {
          locationId_unitNumber: {
            locationId: existing.locationId,
            unitNumber: input.unitNumber,
          },
        },
      });

      if (conflict) {
        throw new ConflictError(
          `Unit ${input.unitNumber} already exists at this location`
        );
      }
    }

    const unit = await prisma.storageUnit.update({
      where: { id },
      data: input,
    });

    return unit;
  }

  // Update unit status
  async updateStatus(id: string, status: UnitStatus): Promise<StorageUnit> {
    const existing = await prisma.storageUnit.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Storage unit');
    }

    // Don't allow setting to AVAILABLE if there are active bookings
    if (status === 'AVAILABLE' && existing.bookings.length > 0) {
      throw new ConflictError(
        'Cannot set status to AVAILABLE while there are active bookings'
      );
    }

    const unit = await prisma.storageUnit.update({
      where: { id },
      data: { status },
    });

    return unit;
  }

  // Delete unit (soft delete)
  async deleteUnit(id: string): Promise<void> {
    const unit = await prisma.storageUnit.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    if (unit.bookings.length > 0) {
      throw new ConflictError(
        'Cannot delete unit with active bookings'
      );
    }

    await prisma.storageUnit.update({
      where: { id },
      data: { isActive: false },
    });
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
    const unit = await prisma.storageUnit.findUnique({
      where: { id: unitId },
    });

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
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        unitId,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    return {
      available: conflictingBookings.length === 0,
      conflicts: conflictingBookings.map((b) => ({
        bookingId: b.id,
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
  ): Promise<StorageUnit[]> {
    const where: Prisma.StorageUnitWhereInput = {
      locationId,
      isActive: true,
      status: 'AVAILABLE',
      bookings: {
        none: {
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
          OR: [
            {
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
          ],
        },
      },
    };

    if (size) {
      where.size = size as any;
    }

    return prisma.storageUnit.findMany({
      where,
      orderBy: { basePriceHourly: 'asc' },
    });
  }
}

export const unitService = new UnitService();
