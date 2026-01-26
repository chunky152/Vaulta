import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { NotificationType, NotificationCategory } from '@prisma/client';

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
      const msg: sgMail.MailDataRequired = {
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
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        data: data.data ?? {},
      },
    });

    // Get user and preferences
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, phone: true },
    });

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: data.userId },
    });

    if (!user) return;

    // Send based on type and preferences
    let sent = false;

    if (data.type === 'EMAIL' && user.email) {
      const shouldSend = this.checkPreference(preferences, 'email', data.category);
      if (shouldSend) {
        sent = await this.sendEmail({
          to: user.email,
          subject: data.title,
          text: data.message,
        });
      }
    }

    if (data.type === 'SMS' && user.phone) {
      const shouldSend = this.checkPreference(preferences, 'sms', data.category);
      if (shouldSend) {
        sent = await this.sendSMS({
          to: user.phone,
          message: `${data.title}: ${data.message}`,
        });
      }
    }

    // Update sent timestamp if successfully sent
    if (sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
    }
  }

  // Check notification preferences
  private checkPreference(
    preferences: { [key: string]: boolean } | null,
    channel: 'email' | 'sms' | 'push',
    category: NotificationCategory
  ): boolean {
    if (!preferences) return true; // Default to true if no preferences set

    const key = `${channel}${category.charAt(0) + category.slice(1).toLowerCase()}`;
    return preferences[key] !== false;
  }

  // Send booking confirmation
  async sendBookingConfirmation(
    bookingId: string,
    userId: string
  ): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: {
          include: {
            location: true,
          },
        },
        user: {
          select: { firstName: true, email: true },
        },
      },
    });

    if (!booking) return;

    const message = `Your booking at ${booking.unit.location.name} has been confirmed.
Booking Number: ${booking.bookingNumber}
Location: ${booking.unit.location.address}, ${booking.unit.location.city}
Unit: ${booking.unit.unitNumber}
Start: ${booking.startTime.toLocaleString()}
End: ${booking.endTime.toLocaleString()}
Access Code: ${booking.accessCode}`;

    await this.createNotification({
      userId,
      type: 'EMAIL',
      category: 'BOOKING',
      title: 'Booking Confirmed',
      message,
      data: { bookingId, bookingNumber: booking.bookingNumber },
    });
  }

  // Send booking reminder
  async sendBookingReminder(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: {
          include: {
            location: true,
          },
        },
        user: {
          select: { id: true, firstName: true },
        },
      },
    });

    if (!booking) return;

    const message = `Reminder: Your storage booking starts in 1 hour.
Location: ${booking.unit.location.name}
Address: ${booking.unit.location.address}
Unit: ${booking.unit.unitNumber}
Access Code: ${booking.accessCode}`;

    await this.createNotification({
      userId: booking.user.id,
      type: 'SMS',
      category: 'REMINDER',
      title: 'Booking Starts Soon',
      message,
      data: { bookingId, bookingNumber: booking.bookingNumber },
    });
  }

  // Send checkout reminder
  async sendCheckoutReminder(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: {
          include: {
            location: true,
          },
        },
        user: {
          select: { id: true },
        },
      },
    });

    if (!booking) return;

    const message = `Your storage booking ends in 2 hours. Please ensure you retrieve your belongings before ${booking.endTime.toLocaleString()}.`;

    await this.createNotification({
      userId: booking.user.id,
      type: 'SMS',
      category: 'REMINDER',
      title: 'Checkout Reminder',
      message,
      data: { bookingId, bookingNumber: booking.bookingNumber },
    });
  }

  // Send payment confirmation
  async sendPaymentConfirmation(
    userId: string,
    amount: number,
    currency: string,
    bookingNumber: string
  ): Promise<void> {
    const message = `Payment of ${currency} ${amount.toFixed(2)} received for booking ${bookingNumber}. Thank you for using Vaulta!`;

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
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // Delete notification
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
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
    await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: preferences,
    });
  }
}

export const notificationService = new NotificationService();
