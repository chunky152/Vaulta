import { z } from 'zod';
import { BookingStatus } from '../models/Booking.js';

// Create booking schema
export const createBookingSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => data.startTime >= new Date(),
  {
    message: 'Start time must be in the future',
    path: ['startTime'],
  }
).refine(
  (data) => {
    const durationHours = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60);
    return durationHours >= 1;
  },
  {
    message: 'Booking must be at least 1 hour',
    path: ['endTime'],
  }
);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Extend booking schema
export const extendBookingSchema = z.object({
  newEndTime: z.coerce.date(),
}).refine(
  (data) => data.newEndTime > new Date(),
  {
    message: 'New end time must be in the future',
    path: ['newEndTime'],
  }
);

export type ExtendBookingInput = z.infer<typeof extendBookingSchema>;

// Cancel booking schema
export const cancelBookingSchema = z.object({
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// Booking search/list schema (query params)
export const bookingListSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  unitId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(['startTime', 'endTime', 'createdAt', 'totalPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type BookingListInput = z.infer<typeof bookingListSchema>;

// Admin booking list schema (includes user filter)
export const adminBookingListSchema = bookingListSchema.extend({
  userId: z.string().uuid().optional(),
});

export type AdminBookingListInput = z.infer<typeof adminBookingListSchema>;

// Booking ID param schema
export const bookingIdSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
});

export type BookingIdInput = z.infer<typeof bookingIdSchema>;

// Booking action schema (for check-in/check-out)
export const bookingActionSchema = z.object({
  accessCode: z.string().length(6, 'Access code must be 6 digits').optional(),
});

export type BookingActionInput = z.infer<typeof bookingActionSchema>;

// QR code verification schema
export const qrVerificationSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
  accessCode: z.string().length(6, 'Access code must be 6 digits'),
});

export type QRVerificationInput = z.infer<typeof qrVerificationSchema>;

// Price calculation schema
export const priceCalculationSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

export type PriceCalculationInput = z.infer<typeof priceCalculationSchema>;
