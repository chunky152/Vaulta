import { Schema, model, Document } from 'mongoose';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

import { Types } from 'mongoose';

interface IBooking extends Document {
  bookingNumber: string;
  userId: Types.ObjectId;
  unitId: Types.ObjectId;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  totalPrice: number;
  currency: string;
  accessCode?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    unitId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.PENDING },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    checkInTime: Date,
    checkOutTime: Date,
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    accessCode: String,
    notes: String,
    cancellationReason: String,
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ unitId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ startTime: 1, endTime: 1 });

export const Booking = model<IBooking>('Booking', bookingSchema);
