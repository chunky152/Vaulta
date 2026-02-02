import { Schema, model, Document, Types } from 'mongoose';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  DEPOSIT = 'DEPOSIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

interface ITransaction extends Document {
  bookingId?: string;
  userId: Types.ObjectId | string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeRefundId?: string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    bookingId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
    stripePaymentIntentId: String,
    stripeChargeId: String,
    stripeRefundId: String,
    metadata: Schema.Types.Mixed,
    failureReason: String,
  },
  { timestamps: true }
);

transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ stripePaymentIntentId: 1 });
transactionSchema.index({ status: 1 });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
