import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

export class MessagingService {
    private twilioClient: twilio.Twilio | null = null;
    private sendGridApiKey: string | undefined;
    private sendGridFromEmail: string | undefined;
    private twilioPhoneNumber: string | undefined;

    constructor() {
        this.sendGridApiKey = process.env.SENDGRID_API_KEY;
        this.sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL;

        if (this.sendGridApiKey) {
            sgMail.setApiKey(this.sendGridApiKey);
        } else {
            console.warn('SENDGRID_API_KEY is not set. Email sending will be disabled.');
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && this.twilioPhoneNumber) {
            this.twilioClient = twilio(accountSid, authToken);
        } else {
            console.warn('Twilio credentials are not set. SMS sending will be disabled.');
        }
    }

    async sendEmail(to: string, subject: string, content: string, htmlContent?: string): Promise<boolean> {
        if (!this.sendGridApiKey || !this.sendGridFromEmail) {
            console.warn(`[Mock Email] To: ${to}, Subject: ${subject}`);
            return false; // Service not available
        }

        try {
            await sgMail.send({
                to,
                from: this.sendGridFromEmail,
                subject,
                text: content,
                html: htmlContent || content,
            });
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    async sendSMS(to: string, body: string): Promise<boolean> {
        if (!this.twilioClient || !this.twilioPhoneNumber) {
            console.warn(`[Mock SMS] To: ${to}, Body: ${body}`);
            return false; // Service not available
        }

        try {
            await this.twilioClient.messages.create({
                body,
                from: this.twilioPhoneNumber,
                to,
            });
            return true;
        } catch (error) {
            console.error('Error sending SMS:', error);
            return false;
        }
    }
}

export const messagingService = new MessagingService();
