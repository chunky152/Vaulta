import { Schema, model, Document } from 'mongoose';

interface INotification extends Document {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  category: 'BOOKING' | 'PAYMENT' | 'REMINDER' | 'PROMO' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: 'objectId', required: true },
    type: { type: String, enum: ['EMAIL', 'SMS', 'PUSH'], required: true },
    category: { type: String, enum: ['BOOKING', 'PAYMENT', 'REMINDER', 'PROMO', 'SYSTEM'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: Schema.Types.Mixed,
    sentAt: Date,
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ readAt: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
