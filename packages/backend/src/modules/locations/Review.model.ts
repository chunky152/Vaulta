import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  userId: Types.ObjectId;
  locationId: Types.ObjectId;
  bookingId: Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    bookingId: { type: Schema.Types.ObjectId, required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: String,
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ userId: 1 });
reviewSchema.index({ locationId: 1 });
reviewSchema.index({ rating: 1 });

export const Review = model<IReview>('Review', reviewSchema);
