import { prisma } from '../config/database.js';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} from '../types/index.js';
import {
  generateBookingNumber,
  generateAccessCode,
} from '../utils/helpers.js';
import { pricingService } from './pricing.service.js';
import { unitService } from './unit.service.js';
import {
  CreateBookingInput,
  BookingListInput,
  ExtendBookingInput,
} from '../validators/booking.validator.js';

export class BookingService {
  // Create a new booking
  async createBooking(
    userId: string,
    input: CreateBookingInput
  ): Promise<Booking> {
    const { unitId, startTime, endTime, notes } = input;

    // Check unit availability
    const availability = await unitService.checkAvailability(
      unitId,
      startTime,
      endTime
    );

    if (!availability.available) {
      throw new ConflictError(
        'Unit is not available for the selected time period'
      );
    }

    // Calculate price
    const priceCalculation = await pricingService.calculatePrice(
      unitId,
      startTime,
      endTime
    );

    // Generate unique booking number
    let bookingNumber: string;
    let attempts = 0;
    do {
      bookingNumber = generateBookingNumber();
      const exists = await prisma.booking.findUnique({
        where: { bookingNumber },
      });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    // Generate access code
    const accessCode = generateAccessCode();

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        userId,
        unitId,
        startTime,
        endTime,
        totalPrice: priceCalculation.total,
        currency: priceCalculation.currency,
        accessCode,
        notes,
        status: 'PENDING',
      },
      include: {
        unit: {
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
        },
      },
    });

    return booking;
  }

  // Get booking by ID
  async getBookingById(bookingId: string, userId?: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // If userId is provided, verify ownership
    if (userId && booking.userId !== userId) {
      throw new AuthorizationError('You can only access your own bookings');
    }

    return booking;
  }

  // Get booking by booking number
  async getBookingByNumber(bookingNumber: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        unit: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    return booking;
  }

  // List user's bookings
  async listUserBookings(
    userId: string,
    input: BookingListInput
  ): Promise<{ bookings: Booking[]; total: number; totalPages: number }> {
    const {
      status,
      unitId,
      locationId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      limit,
    } = input;

    const where: Prisma.BookingWhereInput = { userId };

    if (status) {
      where.status = status;
    }

    if (unitId) {
      where.unitId = unitId;
    }

    if (locationId) {
      where.unit = { locationId };
    }

    if (startDate) {
      where.startTime = { gte: startDate };
    }

    if (endDate) {
      where.endTime = { lte: endDate };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          unit: {
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
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Confirm booking (after payment)
  async confirmBooking(bookingId: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.status !== 'PENDING') {
      throw new ValidationError(
        `Cannot confirm booking with status: ${booking.status}`
      );
    }

    // Re-check availability before confirming
    const availability = await unitService.checkAvailability(
      booking.unitId,
      booking.startTime,
      booking.endTime
    );

    if (!availability.available) {
      // Check if the only conflict is this booking itself
      const otherConflicts = availability.conflicts.filter(
        (c) => c.bookingId !== bookingId
      );

      if (otherConflicts.length > 0) {
        throw new ConflictError(
          'Unit is no longer available for this time period'
        );
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: {
        unit: {
          include: {
            location: true,
          },
        },
      },
    });

    return updatedBooking;
  }

  // Check in to a booking
  async checkIn(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId, userId);

    if (booking.status !== 'CONFIRMED') {
      throw new ValidationError(
        `Cannot check in to booking with status: ${booking.status}`
      );
    }

    // Check if within check-in window (e.g., 1 hour before start time)
    const now = new Date();
    const checkInWindowStart = new Date(
      booking.startTime.getTime() - 60 * 60 * 1000
    ); // 1 hour before

    if (now < checkInWindowStart) {
      throw new ValidationError(
        'Check-in is only available 1 hour before the booking starts'
      );
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'ACTIVE',
          checkInTime: now,
        },
      });

      // Update unit status
      await tx.storageUnit.update({
        where: { id: booking.unitId },
        data: { status: 'OCCUPIED' },
      });

      return updated;
    });

    return updatedBooking;
  }

  // Check out from a booking
  async checkOut(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId, userId);

    if (booking.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot check out from booking with status: ${booking.status}`
      );
    }

    const now = new Date();

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'COMPLETED',
          checkOutTime: now,
        },
      });

      // Update unit status
      await tx.storageUnit.update({
        where: { id: booking.unitId },
        data: { status: 'AVAILABLE' },
      });

      // Award loyalty points (1 point per $1 spent)
      const points = Math.floor(booking.totalPrice);
      if (points > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: points } },
        });

        await tx.loyaltyTransaction.create({
          data: {
            userId,
            points,
            type: 'EARNED',
            source: 'BOOKING',
            referenceId: bookingId,
            description: `Points earned from booking ${booking.bookingNumber}`,
          },
        });
      }

      return updated;
    });

    return updatedBooking;
  }

  // Extend booking duration
  async extendBooking(
    bookingId: string,
    userId: string,
    input: ExtendBookingInput
  ): Promise<{ booking: Booking; additionalPrice: number }> {
    const booking = await this.getBookingById(bookingId, userId);

    if (!['CONFIRMED', 'ACTIVE'].includes(booking.status)) {
      throw new ValidationError(
        `Cannot extend booking with status: ${booking.status}`
      );
    }

    if (input.newEndTime <= booking.endTime) {
      throw new ValidationError('New end time must be after current end time');
    }

    // Check availability for extension period
    const availability = await unitService.checkAvailability(
      booking.unitId,
      booking.endTime,
      input.newEndTime
    );

    if (!availability.available) {
      throw new ConflictError(
        'Unit is not available for the extended period'
      );
    }

    // Calculate additional price
    const extensionPrice = await pricingService.calculatePrice(
      booking.unitId,
      booking.endTime,
      input.newEndTime
    );

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        endTime: input.newEndTime,
        totalPrice: booking.totalPrice + extensionPrice.total,
      },
    });

    return {
      booking: updatedBooking,
      additionalPrice: extensionPrice.total,
    };
  }

  // Cancel booking
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<Booking> {
    const booking = await this.getBookingById(bookingId, userId);

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new ValidationError(
        `Cannot cancel booking with status: ${booking.status}`
      );
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
        },
      });

      // If unit was reserved, set back to available
      await tx.storageUnit.update({
        where: { id: booking.unitId },
        data: { status: 'AVAILABLE' },
      });

      return updated;
    });

    return updatedBooking;
  }

  // Regenerate access code
  async regenerateAccessCode(
    bookingId: string,
    userId: string
  ): Promise<string> {
    const booking = await this.getBookingById(bookingId, userId);

    if (!['CONFIRMED', 'ACTIVE'].includes(booking.status)) {
      throw new ValidationError('Cannot regenerate access code for this booking');
    }

    const newCode = generateAccessCode();

    await prisma.booking.update({
      where: { id: bookingId },
      data: { accessCode: newCode },
    });

    return newCode;
  }

  // Get upcoming bookings (for reminders)
  async getUpcomingBookings(hoursAhead: number = 24): Promise<Booking[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: {
          gte: now,
          lte: cutoff,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            phone: true,
          },
        },
        unit: {
          include: {
            location: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  // Get expiring bookings (for auto-checkout reminders)
  async getExpiringBookings(hoursAhead: number = 2): Promise<Booking[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        endTime: {
          gte: now,
          lte: cutoff,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            phone: true,
          },
        },
      },
    });
  }
}

export const bookingService = new BookingService();
