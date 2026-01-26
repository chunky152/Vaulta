import Stripe from 'stripe';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { NotFoundError, ValidationError, AppError } from '../types/index.js';
import { bookingService } from './booking.service.js';

// Initialize Stripe
const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

export class PaymentService {
  // Create a payment intent for a booking
  async createPaymentIntent(
    bookingId: string,
    userId: string
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }> {
    if (!stripe) {
      throw new AppError('Payment service is not configured', 500);
    }

    const booking = await bookingService.getBookingById(bookingId, userId);

    if (booking.status !== 'PENDING') {
      throw new ValidationError(
        `Cannot create payment for booking with status: ${booking.status}`
      );
    }

    // Check if there's already a pending transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        bookingId,
        status: 'PENDING',
        type: 'PAYMENT',
      },
    });

    if (existingTransaction?.stripePaymentIntentId) {
      // Return existing payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingTransaction.stripePaymentIntentId
      );

      if (paymentIntent.client_secret) {
        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: booking.totalPrice,
          currency: booking.currency,
        };
      }
    }

    // Create new payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // Convert to cents
      currency: booking.currency.toLowerCase(),
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        bookingId,
        userId,
        amount: booking.totalPrice,
        currency: booking.currency,
        type: 'PAYMENT',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new AppError('Failed to create payment intent', 500);
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: booking.totalPrice,
      currency: booking.currency,
    };
  }

  // Handle Stripe webhook events
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!stripe || !config.stripe.webhookSecret) {
      throw new AppError('Payment service is not configured', 500);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      throw new ValidationError(`Webhook signature verification failed`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // Handle successful payment
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const { bookingId } = paymentIntent.metadata;

    if (!bookingId) {
      console.error('Payment intent missing bookingId metadata');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.transaction.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: 'COMPLETED',
          stripeChargeId: paymentIntent.latest_charge as string,
        },
      });

      // Confirm booking
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Update unit status to reserved
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { unitId: true },
      });

      if (booking) {
        await tx.storageUnit.update({
          where: { id: booking.unitId },
          data: { status: 'RESERVED' },
        });
      }
    });

    console.log(`Payment succeeded for booking: ${bookingId}`);
  }

  // Handle failed payment
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const { bookingId } = paymentIntent.metadata;

    if (!bookingId) {
      console.error('Payment intent missing bookingId metadata');
      return;
    }

    await prisma.transaction.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        failureReason: paymentIntent.last_payment_error?.message ?? 'Payment failed',
      },
    });

    console.log(`Payment failed for booking: ${bookingId}`);
  }

  // Handle refund
  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    // Find the original transaction
    const transaction = await prisma.transaction.findFirst({
      where: { stripeChargeId: charge.id },
    });

    if (!transaction) {
      console.error('Transaction not found for charge:', charge.id);
      return;
    }

    // Create refund transaction record
    await prisma.transaction.create({
      data: {
        bookingId: transaction.bookingId,
        userId: transaction.userId,
        amount: (charge.amount_refunded ?? 0) / 100,
        currency: charge.currency.toUpperCase(),
        type: 'REFUND',
        status: 'COMPLETED',
        stripeRefundId: charge.refunds?.data[0]?.id,
        metadata: {
          originalTransactionId: transaction.id,
        },
      },
    });

    // Update original transaction status if fully refunded
    if (charge.refunded) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'REFUNDED' },
      });
    }
  }

  // Request a refund
  async requestRefund(
    bookingId: string,
    userId: string,
    amount?: number
  ): Promise<{ refundId: string; amount: number }> {
    if (!stripe) {
      throw new AppError('Payment service is not configured', 500);
    }

    const booking = await bookingService.getBookingById(bookingId, userId);

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new ValidationError(
        'Refunds are only available for pending or confirmed bookings'
      );
    }

    // Find the completed transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        bookingId,
        type: 'PAYMENT',
        status: 'COMPLETED',
      },
    });

    if (!transaction || !transaction.stripePaymentIntentId) {
      throw new NotFoundError('Payment transaction');
    }

    const refundAmount = amount ?? booking.totalPrice;

    // Calculate refund based on cancellation policy
    const refundPolicy = this.calculateRefundAmount(booking, refundAmount);

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      amount: Math.round(refundPolicy.refundAmount * 100),
      metadata: {
        bookingId: booking.id,
        reason: refundPolicy.reason,
      },
    });

    // Cancel the booking
    await bookingService.cancelBooking(
      bookingId,
      userId,
      'Refund requested by customer'
    );

    return {
      refundId: refund.id,
      amount: refundPolicy.refundAmount,
    };
  }

  // Calculate refund amount based on cancellation policy
  private calculateRefundAmount(
    booking: { startTime: Date; totalPrice: number },
    requestedAmount: number
  ): { refundAmount: number; reason: string } {
    const now = new Date();
    const hoursUntilStart =
      (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercentage: number;
    let reason: string;

    if (hoursUntilStart >= 48) {
      refundPercentage = 1.0; // 100% refund
      reason = 'Full refund - cancelled more than 48 hours before start';
    } else if (hoursUntilStart >= 24) {
      refundPercentage = 0.75; // 75% refund
      reason = 'Partial refund - cancelled 24-48 hours before start';
    } else if (hoursUntilStart >= 6) {
      refundPercentage = 0.5; // 50% refund
      reason = 'Partial refund - cancelled 6-24 hours before start';
    } else {
      refundPercentage = 0; // No refund
      reason = 'No refund - cancelled less than 6 hours before start';
    }

    const maxRefund = booking.totalPrice * refundPercentage;
    const refundAmount = Math.min(requestedAmount, maxRefund);

    return { refundAmount, reason };
  }

  // Get payment history for a user
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: any[];
    total: number;
    totalPages: number;
  }> {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const paymentService = new PaymentService();
