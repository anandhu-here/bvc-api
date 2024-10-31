import admin from "firebase-admin";
import type { IFcmToken, IUser } from "src/interfaces/entities/user";

class FirebaseServices {
  constructor() {}

  /**
   * Send a notification to multiple FCM tokens.
   * @param user The user object containing the FCM tokens.
   * @param data The data payload to be sent with the notification.
   */
  public async sendNotification(user: IUser, data: object): Promise<void> {
    try {
      // Extract FCM tokens from the user object
      const tokens = user.fcmTokens.map(
        (tokenObj: IFcmToken) => tokenObj.token
      );

      if (tokens.length === 0) {
        console.log("No FCM tokens found for the user");
        return;
      }

      const message = {
        tokens: tokens, // Specify tokens for multicast messaging
        data: {
          ...data, // Include any additional data you want to send
        },
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true, // Data-only notifications
            },
          },
        },
        webpush: {
          headers: {
            Urgency: "very-low", // Optional, can be used for background handling
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message as any);
      console.log("Successfully sent messages:", response);

      if (response.failureCount > 0) {
        console.log(
          "Failed messages:",
          response.responses.filter((res) => !res.success)
        );
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}

export default FirebaseServices;
