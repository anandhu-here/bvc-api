import admin from "firebase-admin";
import Logger from "../logger";
import {
  INotificationHistory,
  NotificationHistory,
} from "src/models/Notifications";

interface NotificationPayload {
  notification: {
    title: string;
    body: string;
  };
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  data?: { [key: string]: string };
}

interface SendResult {
  success: boolean;
  token: string;
  error?: string;
}

class PushNotification {
  private static instance: PushNotification;

  constructor() {
    // Private constructor to prevent direct construction calls with the `new` operator.
  }

  public static getInstance(): PushNotification {
    if (!PushNotification.instance) {
      PushNotification.instance = new PushNotification();
    }
    return PushNotification.instance;
  }

  public async sendToDevice(
    token: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        ...payload,
        token: token,
      };

      const response = await admin.messaging().send(message);
      Logger.info(`Successfully sent message to device: ${response}`);
    } catch (error: any) {
      Logger.error(`Error sending message to device: ${error}`);

      throw error;
    }
  }

  public async sendToMultipleDevices(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<void> {
    try {
      if (!tokens || tokens.length === 0) {
        Logger.warn("No tokens provided for sending notifications");
        return;
      }

      const sendPromises = tokens.map((token) =>
        admin
          .messaging()
          .send({
            ...payload,
            token: token,
          })
          .then(() => ({ success: true, token } as SendResult))
          .catch(
            (error) =>
              ({
                success: false,
                token,
                error: error.message || "Unknown error",
              } as SendResult)
          )
      );

      const results = await Promise.all(sendPromises);

      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.length - successCount;

      Logger.info(`Successfully sent message to ${successCount} devices`);

      if (failureCount > 0) {
        const failedTokens = results.filter((result) => !result.success);

        Logger.warn(`Failed to send message to ${failureCount} devices`);
        failedTokens.forEach(({ token, error }) => {
          if (error) {
            Logger.warn(`Token: ${token}, Error: ${error}`);

            if (error.includes("not registered")) {
              Logger.info(`Invalid token detected: ${token}`);
              // TODO: Implement logic to remove invalid token from your storage
            } else if (error.includes("authentication error")) {
              Logger.error(
                `Authentication error for token: ${token}. Check your Firebase credentials.`
              );
            } else if (error.includes("message rate exceeded")) {
              Logger.warn(
                `Message rate limit exceeded for token: ${token}. Consider implementing rate limiting.`
              );
            } else {
              Logger.error(`Unexpected error for token ${token}: ${error}`);
            }
          } else {
            Logger.warn(`Token: ${token}, Error: Unknown error`);
          }
        });
      }
    } catch (error: any) {
      Logger.error("Error in sendToMultipleDevices:", error);
      // Instead of throwing, we'll just log the error
      // This prevents the error from crashing the server
    }
  }

  public async sendToTopic(
    topic: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        ...payload,
        topic: topic,
      };

      const response = await admin.messaging().send(message);
      Logger.info(`Successfully sent message to topic: ${response}`);

      // Save to notification history
    } catch (error: any) {
      Logger.error(`Error sending message to topic: ${error}`);

      throw error;
    }
  }

  public async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<void> {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      Logger.info(
        `Successfully subscribed to topic: ${response.successCount} successful, ${response.failureCount} failed.`
      );
    } catch (error: any) {
      Logger.error(`Error subscribing to topic: ${error}`);
      throw error;
    }
  }

  public async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<void> {
    try {
      const response = await admin
        .messaging()
        .unsubscribeFromTopic(tokens, topic);
      Logger.info(
        `Successfully unsubscribed from topic: ${response.successCount} successful, ${response.failureCount} failed.`
      );
    } catch (error: any) {
      Logger.error(`Error unsubscribing from topic: ${error}`);
      throw error;
    }
  }
}

export default PushNotification;
