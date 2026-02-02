import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { config } from '../config/index.js';

// Notification enums
type NotificationType = 'EMAIL' | 'SMS' | 'PUSH';
type NotificationCategory = 'BOOKING' | 'PAYMENT' | 'REMINDER' | 'PROMO' | 'SYSTEM';

// Initialize SendGrid
if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

// Initialize Twilio (only if valid credentials are provided)
const twilioClient =
  config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.accountSid.startsWith('AC')
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicData?: Record<string, unknown>;
}

interface SendSMSOptions {
  to: string;
  message: string;
}

interface NotificationData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  // Send an email
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!config.sendgrid.apiKey) {
      console.log('SendGrid not configured, skipping email:', options.subject);
      return false;
    }

    try {
      const msg: any = {
        to: options.to,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName,
        },
        subject: options.subject,
      };

      if (options.templateId) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.dynamicData;
      } else {
        msg.text = options.text ?? '';
        msg.html = options.html ?? options.text ?? '';
      }

      await sgMail.send(msg);
      console.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Send an SMS
  async sendSMS(options: SendSMSOptions): Promise<boolean> {
    if (!twilioClient || !config.twilio.phoneNumber) {
      console.log('Twilio not configured, skipping SMS:', options.message);
      return false;
    }

    try {
      await twilioClient.messages.create({
        body: options.message,
        to: options.to,
        from: config.twilio.phoneNumber,
      });
      console.log(`SMS sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Create and send a notification
  async createNotification(data: NotificationData): Promise<void> {
    // Create notification record
    const notification = await Notification.create({
      userId: data.userId,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      data: data.data ?? {},
    });

    // Get user and preferences
    const user = await User.findById(data.userId).select('email phone');

    const preferences = await NotificationPreference.findOne({
      userId: data.userId,
    });

    if (!user) return;

    // Send based on type and preferences
    let sent = false;

    if (data.type === 'EMAIL' && (user as any).email) {
      const shouldSend = this.checkPreference(preferences, 'email', data.category);
      if (shouldSend) {
        sent = await this.sendEmail({
          to: (user as any).email,
          subject: data.title,
          text: data.message,
        });
      }
    }

    if (data.type === 'SMS' && (user as any).phone) {
      const shouldSend = this.checkPreference(preferences, 'sms', data.category);
      if (shouldSend) {
        sent = await this.sendSMS({
          to: (user as any).phone,
          message: `${data.title}: ${data.message}`,
        });
      }
    }

    // Update sent timestamp if successfully sent
    if (sent) {
      await Notification.updateOne(
        { _id: notification._id },
        { sentAt: new Date() }
      );
    }
  }

  // Check notification preferences
  private checkPreference(
    preferences: any,
    channel: 'email' | 'sms' | 'push',
    category: NotificationCategory
  ): boolean {
    if (!preferences) return true; // Default to true if no preferences set

    const key = `${channel}${category.charAt(0) + category.slice(1).toLowerCase()}`;
    return (preferences as any)[key] !== false;
  }

  // Send booking confirmation
  async sendBookingConfirmation(
    bookingId: string,
    userId: string
  ): Promise<void> {
    const booking = await Booking.findById(bookingId).populate({
      path: 'unitId',
      populate: {
        path: 'locationId',
      },
    }).populate({
      path: 'userId',
      select: 'firstName email',
    });

    if (!booking) return;

    const unit = (booking as any).unitId;
    const location = unit?.locationId;
    const bookingUser = (booking as any).userId;

    const message = `Your booking at ${location?.name} has been confirmed.
Booking Number: ${(booking as any).bookingNumber}
Location: ${location?.address}, ${location?.city}
Unit: ${unit?.unitNumber}
Start: ${(booking as any).startTime.toLocaleString()}
End: ${(booking as any).endTime.toLocaleString()}
Access Code: ${(booking as any).accessCode}`;

    await this.createNotification({
      userId,
      type: 'EMAIL',
      category: 'BOOKING',
      title: 'Booking Confirmed',
      message,
      data: { bookingId, bookingNumber: (booking as any).bookingNumber },
    });
  }

  // Send booking reminder
  async sendBookingReminder(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId).populate({
      path: 'unitId',
      populate: {
        path: 'locationId',
      },
    }).populate({
      path: 'userId',
      select: 'id firstName',
    });

    if (!booking) return;

    const unit = (booking as any).unitId;
    const location = unit?.locationId;
    const bookingUser = (booking as any).userId;

    const message = `Reminder: Your storage booking starts in 1 hour.
Location: ${location?.name}
Address: ${location?.address}
Unit: ${unit?.unitNumber}
Access Code: ${(booking as any).accessCode}`;

    await this.createNotification({
      userId: bookingUser?.id || '',
      type: 'SMS',
      category: 'REMINDER',
      title: 'Booking Starts Soon',
      message,
      data: { bookingId, bookingNumber: (booking as any).bookingNumber },
    });
  }

  // Send checkout reminder
  async sendCheckoutReminder(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId).populate({
      path: 'unitId',
      populate: {
        path: 'locationId',
      },
    }).populate({
      path: 'userId',
      select: 'id',
    });

    if (!booking) return;

    const bookingUser = (booking as any).userId;

    const message = `Your storage booking ends in 2 hours. Please ensure you retrieve your belongings before ${(booking as any).endTime.toLocaleString()}.`;

    await this.createNotification({
      userId: bookingUser?.id || '',
      type: 'SMS',
      category: 'REMINDER',
      title: 'Checkout Reminder',
      message,
      data: { bookingId, bookingNumber: (booking as any).bookingNumber },
    });
  }

  // Send payment confirmation
  async sendPaymentConfirmation(
    userId: string,
    amount: number,
    currency: string,
    bookingNumber: string
  ): Promise<void> {
    const message = `Payment of ${currency} ${amount.toFixed(2)} received for booking ${bookingNumber}. Thank you for using Unbur!`;

    await this.createNotification({
      userId,
      type: 'EMAIL',
      category: 'PAYMENT',
      title: 'Payment Received',
      message,
      data: { amount, currency, bookingNumber },
    });
  }

  // Send refund notification
  async sendRefundNotification(
    userId: string,
    amount: number,
    currency: string,
    bookingNumber: string
  ): Promise<void> {
    const message = `A refund of ${currency} ${amount.toFixed(2)} has been processed for booking ${bookingNumber}. It may take 5-10 business days to appear in your account.`;

    await this.createNotification({
      userId,
      type: 'EMAIL',
      category: 'PAYMENT',
      title: 'Refund Processed',
      message,
      data: { amount, currency, bookingNumber },
    });
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const where: any = { userId };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(where),
      Notification.countDocuments({
        userId,
        readAt: null,
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.updateMany(
      { _id: notificationId, userId },
      { readAt: new Date() }
    );
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, readAt: null },
      { readAt: new Date() }
    );
  }

  // Delete notification
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await Notification.deleteMany({
      _id: notificationId,
      userId,
    });
  }

  // Update notification preferences
  async updatePreferences(
    userId: string,
    preferences: Partial<{
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
    }>
  ): Promise<void> {
    const existing = await NotificationPreference.findOne({ userId });

    if (existing) {
      await NotificationPreference.updateOne(
        { userId },
        preferences
      );
    } else {
      await NotificationPreference.create({
        userId,
        ...preferences,
      });
    }
  }
}

export const notificationService = new NotificationService();
