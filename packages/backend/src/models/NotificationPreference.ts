import { Schema, model, Document } from 'mongoose';

interface INotificationPreference extends Document {
  userId: string;
  emailBooking: boolean;
  emailPayment: boolean;
  emailReminder: boolean;
  emailPromo: boolean;
  smsBooking: boolean;
  smsPayment: boolean;
  smsReminder: boolean;
  smsPromo: boolean;
  pushBooking: boolean;
  pushPayment: boolean;
  pushReminder: boolean;
  pushPromo: boolean;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>({
  userId: { type: 'objectId', required: true, unique: true },
  emailBooking: { type: Boolean, default: true },
  emailPayment: { type: Boolean, default: true },
  emailReminder: { type: Boolean, default: true },
  emailPromo: { type: Boolean, default: true },
  smsBooking: { type: Boolean, default: true },
  smsPayment: { type: Boolean, default: false },
  smsReminder: { type: Boolean, default: true },
  smsPromo: { type: Boolean, default: false },
  pushBooking: { type: Boolean, default: true },
  pushPayment: { type: Boolean, default: true },
  pushReminder: { type: Boolean, default: true },
  pushPromo: { type: Boolean, default: true },
});

export const NotificationPreference = model<INotificationPreference>('NotificationPreference', notificationPreferenceSchema);
