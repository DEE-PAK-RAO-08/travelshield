import * as admin from 'firebase-admin';
import { config } from '../config';
import logger from '../utils/logger';

class NotificationService {
  private isConfigured = false;

  constructor() {
    if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            clientEmail: config.firebase.clientEmail,
            privateKey: config.firebase.privateKey,
          }),
        });
        this.isConfigured = true;
        logger.info('Firebase Admin SDK initialized');
      } catch (error) {
        logger.error('Failed to initialize Firebase Admin SDK', error);
      }
    } else {
      logger.warn('Firebase credentials missing. Push notifications will run in mock mode.');
    }
  }

  async sendPushNotification(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    if (!tokens || tokens.length === 0) return false;

    if (!this.isConfigured) {
      logger.info(`[MOCK PUSH] To: ${tokens.length} devices | Title: ${title} | Body: ${body}`);
      return true;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: { title, body },
        data: data || {},
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        logger.warn(`Push notification partial failure. Success: ${response.successCount}, Failed: ${response.failureCount}`);
        // Optionally handle removing dead tokens here
      } else {
        logger.info(`Push notification sent successfully to ${tokens.length} devices`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to send push notification', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
