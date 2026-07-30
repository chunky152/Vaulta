import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';
import { requireUser } from '../../shared/middleware/auth.middleware.js';
import { buildPagination } from '../../shared/utils/helpers.js';
import { paymentService } from './payment.service.js';

export class PaymentController {
  // Create payment intent for a booking
  async createPaymentIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const { bookingId } = req.body;

    const result = await paymentService.createPaymentIntent(
      bookingId,
      user.id
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  }

  // Handle Stripe webhook
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    try {
      await paymentService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook handler failed' });
    }
  }

  // Request refund
  async requestRefund(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const { bookingId } = req.params;
    const { amount } = req.body;

    const result = await paymentService.requestRefund(
      bookingId as string,
      user.id,
      amount
    );

    const response: ApiResponse = {
      success: true,
      message: 'Refund processed successfully',
      data: result,
    };

    res.json(response);
  }

  // Get payment history
  async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await paymentService.getPaymentHistory(
      user.id,
      page,
      limit
    );

    const response: ApiResponse = {
      success: true,
      data: {
        transactions: result.transactions,
        pagination: buildPagination(page, limit, result.total),
      },
    };

    res.json(response);
  }
}

export const paymentController = new PaymentController();
