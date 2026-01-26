import { Router, raw } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { strictRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Stripe webhook (must use raw body parser)
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  asyncHandler(paymentController.handleWebhook.bind(paymentController))
);

// Protected routes
router.use(authenticate);

// Create payment intent
router.post(
  '/create-intent',
  strictRateLimiter,
  asyncHandler(paymentController.createPaymentIntent.bind(paymentController))
);

// Get payment history
router.get(
  '/history',
  asyncHandler(paymentController.getPaymentHistory.bind(paymentController))
);

// Request refund
router.post(
  '/refund/:bookingId',
  strictRateLimiter,
  asyncHandler(paymentController.requestRefund.bind(paymentController))
);

export default router;
