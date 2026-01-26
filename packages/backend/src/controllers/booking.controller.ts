import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse } from '../types/index.js';
import { bookingService } from '../services/booking.service.js';
import { pricingService } from '../services/pricing.service.js';
import { generateQRCodeDataURL } from '../utils/qrcode.js';
import {
  CreateBookingInput,
  BookingListInput,
  ExtendBookingInput,
  CancelBookingInput,
  PriceCalculationInput,
} from '../validators/booking.validator.js';

export class BookingController {
  // Create a new booking
  async createBooking(
    req: AuthenticatedRequest & { body: CreateBookingInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const booking = await bookingService.createBooking(req.user.id, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Booking created successfully. Please proceed to payment.',
      data: { booking },
    };

    res.status(201).json(response);
  }

  // Get user's bookings
  async getMyBookings(
    req: AuthenticatedRequest & { query: BookingListInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const result = await bookingService.listUserBookings(req.user.id, req.query);

    const response: PaginatedResponse<typeof result.bookings[0]> = {
      success: true,
      data: result.bookings,
      pagination: {
        page: req.query.page ?? 1,
        limit: req.query.limit ?? 20,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: (req.query.page ?? 1) < result.totalPages,
        hasPrev: (req.query.page ?? 1) > 1,
      },
    };

    res.json(response);
  }

  // Get booking by ID
  async getBookingById(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const booking = await bookingService.getBookingById(
      id as string,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: { booking },
    };

    res.json(response);
  }

  // Get booking by booking number
  async getBookingByNumber(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { bookingNumber } = req.params;

    const booking = await bookingService.getBookingByNumber(bookingNumber as string);

    // Only return public info if not authenticated as the owner
    if (!req.user || req.user.id !== booking.userId) {
      const response: ApiResponse = {
        success: true,
        data: {
          booking: {
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            startTime: booking.startTime,
            endTime: booking.endTime,
          },
        },
      };
      res.json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { booking },
    };

    res.json(response);
  }

  // Calculate price for a booking
  async calculatePrice(
    req: AuthenticatedRequest & { body: PriceCalculationInput },
    res: Response
  ): Promise<void> {
    const { unitId, startTime, endTime } = req.body;

    const pricing = await pricingService.calculatePrice(
      unitId,
      startTime,
      endTime
    );

    const response: ApiResponse = {
      success: true,
      data: { pricing },
    };

    res.json(response);
  }

  // Check in to booking
  async checkIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const booking = await bookingService.checkIn(id as string, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Checked in successfully',
      data: { booking },
    };

    res.json(response);
  }

  // Check out from booking
  async checkOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const booking = await bookingService.checkOut(id as string, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Checked out successfully. Thank you for using Vaulta!',
      data: { booking },
    };

    res.json(response);
  }

  // Extend booking
  async extendBooking(
    req: AuthenticatedRequest & { body: ExtendBookingInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const result = await bookingService.extendBooking(
      id as string,
      req.user.id,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      message: `Booking extended. Additional charge: ${result.booking.currency} ${result.additionalPrice.toFixed(2)}`,
      data: {
        booking: result.booking,
        additionalPrice: result.additionalPrice,
      },
    };

    res.json(response);
  }

  // Cancel booking
  async cancelBooking(
    req: AuthenticatedRequest & { body: CancelBookingInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const booking = await bookingService.cancelBooking(
      id as string,
      req.user.id,
      reason
    );

    const response: ApiResponse = {
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking },
    };

    res.json(response);
  }

  // Get access code
  async getAccessCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const booking = await bookingService.getBookingById(
      id as string,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: { accessCode: booking.accessCode },
    };

    res.json(response);
  }

  // Regenerate access code
  async regenerateAccessCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const accessCode = await bookingService.regenerateAccessCode(
      id as string,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      message: 'Access code regenerated',
      data: { accessCode },
    };

    res.json(response);
  }

  // Get QR code for booking
  async getQRCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const booking = await bookingService.getBookingById(
      id as string,
      req.user.id
    );

    const qrData = {
      type: 'booking' as const,
      id: booking.id,
      accessCode: booking.accessCode ?? undefined,
      expiresAt: booking.endTime.toISOString(),
    };

    const qrCodeDataUrl = await generateQRCodeDataURL(qrData);

    const response: ApiResponse = {
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        bookingNumber: booking.bookingNumber,
        accessCode: booking.accessCode,
      },
    };

    res.json(response);
  }
}

export const bookingController = new BookingController();
