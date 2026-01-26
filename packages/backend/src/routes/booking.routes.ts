import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createBookingSchema,
  bookingListSchema,
  bookingIdSchema,
  extendBookingSchema,
  cancelBookingSchema,
  priceCalculationSchema,
} from '../validators/booking.validator.js';

const router = Router();

// Calculate price (public)
router.post(
  '/calculate-price',
  validate(priceCalculationSchema),
  asyncHandler(bookingController.calculatePrice.bind(bookingController))
);

// Lookup by booking number (optionally authenticated)
router.get(
  '/number/:bookingNumber',
  optionalAuth,
  asyncHandler(bookingController.getBookingByNumber.bind(bookingController))
);

// Protected routes
router.use(authenticate);

// Get user's bookings
router.get(
  '/',
  validate(bookingListSchema, 'query'),
  asyncHandler(bookingController.getMyBookings.bind(bookingController))
);

// Create booking
router.post(
  '/',
  validate(createBookingSchema),
  asyncHandler(bookingController.createBooking.bind(bookingController))
);

// Get booking by ID
router.get(
  '/:id',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.getBookingById.bind(bookingController))
);

// Check in
router.post(
  '/:id/check-in',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.checkIn.bind(bookingController))
);

// Check out
router.post(
  '/:id/check-out',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.checkOut.bind(bookingController))
);

// Extend booking
router.post(
  '/:id/extend',
  validate(bookingIdSchema, 'params'),
  validate(extendBookingSchema),
  asyncHandler(bookingController.extendBooking.bind(bookingController))
);

// Cancel booking
router.post(
  '/:id/cancel',
  validate(bookingIdSchema, 'params'),
  validate(cancelBookingSchema),
  asyncHandler(bookingController.cancelBooking.bind(bookingController))
);

// Get access code
router.get(
  '/:id/access-code',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.getAccessCode.bind(bookingController))
);

// Regenerate access code
router.post(
  '/:id/access-code',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.regenerateAccessCode.bind(bookingController))
);

// Get QR code
router.get(
  '/:id/qr',
  validate(bookingIdSchema, 'params'),
  asyncHandler(bookingController.getQRCode.bind(bookingController))
);

export default router;
