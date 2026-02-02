import { Schema, model, Document } from 'mongoose';

interface IReview extends Document {
  userId: string;
  locationId: string;
  bookingId: string;
  rating: number;
  title?: string;
  comment?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: 'objectId', required: true },
    locationId: { type: 'objectId', required: true },
    bookingId: { type: 'objectId', required: true, unique: true },
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
