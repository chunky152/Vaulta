import { Booking, IBooking } from './Booking.model.js';
import { StorageUnit } from '../units/StorageUnit.model.js';
import { LoyaltyTransaction } from '../payments/LoyaltyTransaction.model.js';
import { User } from '../auth/User.model.js';
import mongoose, { FilterQuery } from 'mongoose';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} from '../../shared/types/index.js';
import {
  generateBookingNumber,
  generateAccessCode,
} from '../../shared/utils/helpers.js';
import { withTransaction } from '../../shared/config/database.js';
import { pricingService } from '../units/pricing.service.js';
import { unitService } from '../units/unit.service.js';
import {
  CreateBookingInput,
  BookingListInput,
  ExtendBookingInput,
} from './booking.validator.js';

export class BookingService {
  // Create a new booking
  async createBooking(
    userId: string,
    input: CreateBookingInput
  ): Promise<IBooking> {
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

    // Generate access code
    const accessCode = generateAccessCode();

    // Create booking; the unique index on bookingNumber guards against
    // collisions, so retry on duplicate-key errors
    let booking: IBooking | undefined;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      try {
        booking = await Booking.create({
          bookingNumber: generateBookingNumber(),
          userId: new mongoose.Types.ObjectId(userId),
          unitId: new mongoose.Types.ObjectId(unitId),
          startTime,
          endTime,
          totalPrice: priceCalculation.total,
          currency: priceCalculation.currency,
          accessCode,
          notes,
          status: 'PENDING',
        });
      } catch (error) {
        const dupKey = (error as { code?: number; keyPattern?: Record<string, unknown> });
        if (dupKey.code !== 11000 || !dupKey.keyPattern?.bookingNumber) {
          throw error;
        }
      }
    }

    if (!booking) {
      throw new ConflictError('Could not generate a unique booking number');
    }

    await booking.populate({
      path: 'unit',
      populate: {
        path: 'location',
        select: 'id name address city'
      }
    });

    return booking;
  }

  // Get booking by ID
  async getBookingById(bookingId: string, userId?: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'unit',
        populate: {
          path: 'location',
          select: 'id name address city latitude longitude'
        }
      })
      .populate({
        path: 'user',
        select: 'id email firstName lastName phone'
      });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // If userId is provided, verify ownership
    if (userId && booking.userId.toString() !== userId) {
      throw new AuthorizationError('You can only access your own bookings');
    }

    return booking;
  }

  // Get booking by booking number
  async getBookingByNumber(bookingNumber: string): Promise<IBooking> {
    const booking = await Booking.findOne({ bookingNumber })
      .populate({
        path: 'unit',
        populate: {
          path: 'location'
        }
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
  ): Promise<{ bookings: IBooking[]; total: number; totalPages: number }> {
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

    const where: FilterQuery<IBooking> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (status) {
      where.status = status;
    }

    if (unitId) {
      where.unitId = new mongoose.Types.ObjectId(unitId);
    } else if (locationId) {
      // unitId is a ref, not an embedded document, so filter by the
      // location's unit ids
      const unitIds = await StorageUnit.find({
        locationId: new mongoose.Types.ObjectId(locationId),
      }).distinct('_id');
      where.unitId = { $in: unitIds };
    }

    if (startDate) {
      where.startTime = { $gte: startDate };
    }

    if (endDate) {
      where.endTime = { $lte: endDate };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(where)
        .populate({
          path: 'unit',
          populate: {
            path: 'location',
            select: 'id name address city'
          }
        })
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(where),
    ]);

    return {
      bookings,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Confirm booking (after payment)
  async confirmBooking(bookingId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

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
      booking.unitId.toString(),
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

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'CONFIRMED' },
      { new: true }
    ).populate({
      path: 'unit',
      populate: {
        path: 'location'
      }
    });

    if (!updatedBooking) {
      throw new NotFoundError('Booking');
    }

    return updatedBooking;
  }

  // Check in to a booking
  async checkIn(bookingId: string, userId: string): Promise<IBooking> {
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

    return withTransaction(async (session) => {
      const updated = await Booking.findByIdAndUpdate(
        bookingId,
        {
          status: 'ACTIVE',
          checkInTime: now,
        },
        { new: true, session }
      );

      if (!updated) {
        throw new NotFoundError('Booking');
      }

      await StorageUnit.findByIdAndUpdate(
        booking.unitId,
        { status: 'OCCUPIED' },
        { session }
      );

      return updated;
    });
  }

  // Check out from a booking
  async checkOut(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await this.getBookingById(bookingId, userId);

    if (booking.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot check out from booking with status: ${booking.status}`
      );
    }

    const now = new Date();

    return withTransaction(async (session) => {
      const updated = await Booking.findByIdAndUpdate(
        bookingId,
        {
          status: 'COMPLETED',
          checkOutTime: now,
        },
        { new: true, session }
      );

      if (!updated) {
        throw new NotFoundError('Booking');
      }

      await StorageUnit.findByIdAndUpdate(
        booking.unitId,
        { status: 'AVAILABLE' },
        { session }
      );

      // Award loyalty points (1 point per $1 spent)
      const points = Math.floor(booking.totalPrice);
      if (points > 0) {
        await User.findByIdAndUpdate(
          userId,
          { $inc: { loyaltyPoints: points } },
          { session }
        );

        await LoyaltyTransaction.create(
          [{
            userId: new mongoose.Types.ObjectId(userId),
            points,
            type: 'EARNED',
            source: 'BOOKING',
            referenceId: new mongoose.Types.ObjectId(bookingId),
            description: `Points earned from booking ${booking.bookingNumber}`,
          }],
          { session }
        );
      }

      return updated;
    });
  }

  // Extend booking duration
  async extendBooking(
    bookingId: string,
    userId: string,
    input: ExtendBookingInput
  ): Promise<{ booking: IBooking; additionalPrice: number }> {
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
      booking.unitId.toString(),
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
      booking.unitId.toString(),
      booking.endTime,
      input.newEndTime
    );

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        endTime: input.newEndTime,
        totalPrice: booking.totalPrice + extensionPrice.total,
      },
      { new: true }
    );

    if (!updatedBooking) {
      throw new NotFoundError('Booking');
    }

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
  ): Promise<IBooking> {
    const booking = await this.getBookingById(bookingId, userId);

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new ValidationError(
        `Cannot cancel booking with status: ${booking.status}`
      );
    }

    return withTransaction(async (session) => {
      const updated = await Booking.findByIdAndUpdate(
        bookingId,
        {
          status: 'CANCELLED',
          cancellationReason: reason,
        },
        { new: true, session }
      );

      if (!updated) {
        throw new NotFoundError('Booking');
      }

      // If unit was reserved, set back to available
      await StorageUnit.findByIdAndUpdate(
        booking.unitId,
        { status: 'AVAILABLE' },
        { session }
      );

      return updated;
    });
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

    await Booking.findByIdAndUpdate(
      bookingId,
      { accessCode: newCode },
      { new: true }
    );

    return newCode;
  }

  // Get upcoming bookings (for reminders)
  async getUpcomingBookings(hoursAhead: number = 24): Promise<IBooking[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return Booking.find({
      status: 'CONFIRMED',
      startTime: {
        $gte: now,
        $lte: cutoff,
      },
    })
    .populate({
      path: 'user',
      select: 'id email firstName phone'
    })
    .populate({
      path: 'unit',
      populate: {
        path: 'location',
        select: 'name address'
      }
    });
  }

  // Get expiring bookings (for auto-checkout reminders)
  async getExpiringBookings(hoursAhead: number = 2): Promise<IBooking[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return Booking.find({
      status: 'ACTIVE',
      endTime: {
        $gte: now,
        $lte: cutoff,
      },
    })
    .populate({
      path: 'user',
      select: 'id email firstName phone'
    });
  }
}

export const bookingService = new BookingService();
