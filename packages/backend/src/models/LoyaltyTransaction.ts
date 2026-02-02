import { Schema, model, Document } from 'mongoose';

interface ILoyaltyTransaction extends Document {
  userId: string;
  points: number;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS';
  source: 'BOOKING' | 'REFERRAL' | 'PROMO' | 'REVIEW' | 'SIGNUP';
  referenceId?: string;
  description?: string;
  createdAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    userId: { type: 'objectId', required: true },
    points: { type: Number, required: true },
    type: { type: String, enum: ['EARNED', 'REDEEMED', 'EXPIRED', 'BONUS'], required: true },
    source: { type: String, enum: ['BOOKING', 'REFERRAL', 'PROMO', 'REVIEW', 'SIGNUP'], required: true },
    referenceId: 'objectId',
    description: String,
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ userId: 1 });
loyaltyTransactionSchema.index({ type: 1 });

export const LoyaltyTransaction = model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);
