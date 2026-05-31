import twilio from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

class SmsService {
  private client: twilio.Twilio | null = null;
  private isConfigured = false;

  constructor() {
    if (config.twilio.accountSid && config.twilio.authToken) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.isConfigured = true;
      logger.info('Twilio WhatsApp service initialized');
    } else {
      logger.warn('Twilio credentials missing. WhatsApp service will run in mock mode.');
    }
  }

  async sendEmergencyAlert(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      logger.info(`[MOCK WHATSAPP] To: ${to} | Message: ${message}`);
      return true;
    }

    // Format the destination as a WhatsApp number
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const whatsappFrom = config.twilio.whatsappNumber;

    try {
      await this.client.messages.create({
        body: message,
        from: whatsappFrom,
        to: whatsappTo,
      });
      logger.info(`Emergency WhatsApp sent to ${whatsappTo}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send WhatsApp to ${whatsappTo}:`, error);

      // Fallback: try regular SMS if WhatsApp fails
      try {
        if (config.twilio.phoneNumber) {
          await this.client.messages.create({
            body: message,
            from: config.twilio.phoneNumber,
            to,
          });
          logger.info(`Fallback SMS sent to ${to}`);
          return true;
        }
      } catch (smsError) {
        logger.error(`Fallback SMS also failed to ${to}:`, smsError);
      }

      return false;
    }
  }
}

export const smsService = new SmsService();
