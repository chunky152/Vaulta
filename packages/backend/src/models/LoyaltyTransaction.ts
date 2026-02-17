import { Schema, model, Document, Types } from 'mongoose';

interface ILoyaltyTransaction extends Document {
  userId: Types.ObjectId;
  points: number;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS';
  source: 'BOOKING' | 'REFERRAL' | 'PROMO' | 'REVIEW' | 'SIGNUP';
  referenceId?: Types.ObjectId;
  description?: string;
  createdAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true },
    type: { type: String, enum: ['EARNED', 'REDEEMED', 'EXPIRED', 'BONUS'], required: true },
    source: { type: String, enum: ['BOOKING', 'REFERRAL', 'PROMO', 'REVIEW', 'SIGNUP'], required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ userId: 1 });
loyaltyTransactionSchema.index({ type: 1 });

export const LoyaltyTransaction = model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);
