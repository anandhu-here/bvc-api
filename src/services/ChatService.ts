import { Types } from "mongoose";
import { IMessageModel } from "../interfaces/entities/message";
import Message from "src/models/Chat";
import PushNotification from "./PushNotificationService";
import { FCMToken } from "../models/new/FCM";
import Logger from "../logger";
import { IUser, User } from "src/models/new/Heirarchy";
import HistoricNotificationService from "./HistoricNotifications";

class ChatService {
  private pushSvc: PushNotification;

  private notificationSvc: HistoricNotificationService;

  constructor() {
    this.pushSvc = PushNotification.getInstance();
    this.notificationSvc = new HistoricNotificationService();
  }

  public async storeBroadcastMessage(
    senderId: string,
    content: string,
    messageType: string = "text",
    orgId?: string
  ): Promise<IMessageModel> {
    try {
      const sender = await User.findById(senderId);

      if (!sender) {
        throw new Error("Invalid sender");
      }

      const chatId = `broadcast_${senderId}${orgId ? `_${orgId}` : ""}`;

      const newMessage = new Message({
        sender: sender._id,
        content,
        chatId,
        messageType,
        isGlobal: true,
        isBroadcast: true,
        orgId,
      });

      await newMessage.save();

      // Send push notifications to all recipients
      const recipients = await this.getBroadcastRecipients(orgId);
      await this.sendPushNotifications(
        recipients.map((r) => r._id.toString()),
        sender,
        content,
        "BROADCAST_MESSAGE"
      );

      return newMessage;
    } catch (error) {
      Logger.error("Error in storeBroadcastMessage:", error);
      throw error;
    }
  }

  public async getBroadcastRecipients(orgId?: string): Promise<IUser[]> {
    const query: any = {
      role: { $in: ["carer", "nurse", "admin"] },
    };
    if (orgId) {
      query["organizationRoles.organization"] = new Types.ObjectId(orgId);
    }
    return User.find(query);
  }

  public async getBroadcastMessages(
    orgId?: string,
    limit: number = 50,
    before: Date | null = null
  ): Promise<IMessageModel[]> {
    const query: any = {
      isBroadcast: true,
    };
    if (orgId) {
      query.orgId = orgId;
    }
    if (before) {
      query.createdAt = { $lt: before };
    }

    return Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "fname lname avatar")
      .lean();
  }

  public async storeMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: string = "text",
    orgId?: string
  ): Promise<{ message: IMessageModel; notificationSent: boolean }> {
    try {
      const sender = await User.findById(senderId);
      const recipient = await User.findById(recipientId);

      if (!sender || !recipient) {
        throw new Error("Invalid sender or recipient");
      }

      const chatId = this.generateChatId(senderId, recipientId, orgId);

      const newMessage = new Message({
        sender: sender._id,
        receiver: recipient._id,
        content,
        chatId,
        messageType,
        orgId,
      });

      await newMessage.save();

      // Send push notification to the recipient
      const notificationSent = await this.sendPushNotifications(
        [recipientId],
        sender,
        content,
        "NEW_MESSAGE"
      );

      return { message: newMessage, notificationSent };
    } catch (error) {
      Logger.error("Error in storeMessage:", error);
      throw error;
    }
  }

  public async getMessages(
    userId: string,
    otherUserId: string,
    page: number = 1,
    limit: number = 20,
    orgId?: string
  ): Promise<{
    messages: IMessageModel[];
    totalCount: number;
    totalPages: number;
  }> {
    const chatId = this.generateChatId(userId, otherUserId, orgId);
    const skip = (page - 1) * limit;

    const query = { chatId };
    if (orgId) {
      query["orgId"] = orgId;
    }

    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      messages: messages.reverse(),
      totalCount,
      totalPages,
    };
  }

  public async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    const message = await Message.findById(messageId);
    if (message && message.receiver.toString() === userId) {
      await message.markAsRead(new Types.ObjectId(userId));
    }
  }

  private generateChatId(
    userId1: string,
    userId2: string,
    orgId?: string
  ): string {
    const sortedUserIds = [userId1, userId2].sort().join("_");
    return orgId ? `${sortedUserIds}_${orgId}` : sortedUserIds;
  }

  public async getUnreadMessageCount(
    userId: string,
    orgId?: string
  ): Promise<number> {
    const query: any = {
      receiver: userId,
      readBy: { $nin: [userId] },
    };
    if (orgId) {
      query.orgId = orgId;
    }
    return Message.countDocuments(query);
  }

  public async storeGlobalMessage(
    senderId: string,
    recipient: string,
    content: string,
    messageType: string = "text",
    orgId?: string
  ): Promise<IMessageModel> {
    try {
      const sender = await User.findById(senderId);

      if (!sender) {
        throw new Error("Invalid sender");
      }

      const linkedUsers = await this.getLinkedUsers(recipient, senderId, orgId);

      if (linkedUsers.length === 0) {
        throw new Error("No linked users found");
      }

      const chatId = `global_${senderId}_${recipient}${
        orgId ? `_${orgId}` : ""
      }`;

      const newMessage = new Message({
        sender: sender._id,
        recipients: linkedUsers.map((user) => user._id),
        content,
        chatId,
        messageType,
        isGlobal: true,
        orgId,
      });

      await newMessage.save();

      // Send push notifications to all linked users
      await this.sendPushNotifications(
        linkedUsers.map((u) => u._id.toString()),
        sender,
        content,
        "GLOBAL_MESSAGE"
      );

      return newMessage;
    } catch (error) {
      Logger.error("Error in storeGlobalMessage:", error);
      throw error;
    }
  }

  public async getLinkedUsers(
    userType: string,
    userId: string,
    orgId?: string
  ): Promise<IUser[]> {
    const user = await User.findById(userId as string);
    if (!user) {
      throw new Error("Invalid user");
    }

    let linkedUsers: any = [];

    if (userType === "staffs") {
      // Implement logic to get linked staff users
    } else if (userType === "agencies") {
      // Implement logic to get linked agency users
    }

    if (!linkedUsers) {
      return [];
    }

    return User.find({ _id: { $in: linkedUsers.users } });
  }
  public markAllMessagesAsRead = async (
    userId: string,
    chatId: string
  ): Promise<void> => {
    await Message.updateMany(
      { sender: chatId, receiver: userId },
      { $addToSet: { readBy: userId } }
    );
  };

  public async getGlobalMessages(
    homeId: string,
    limit: number = 50,
    before: Date | null = null,
    orgId?: string
  ): Promise<IMessageModel[]> {
    const query: any = {
      isGlobal: true,
      recipients: { $in: [new Types.ObjectId(homeId)] },
    };
    if (orgId) {
      query.orgId = orgId;
    }
    if (before) {
      query.createdAt = { $lt: before };
    }

    return Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  }

  public async getLinkedCarers(homeId: string): Promise<IUser[]> {
    const home = await User.findById(homeId);
    if (!home) {
      throw new Error("Invalid home");
    }

    // Implement logic to get linked carers
    return [] as any;
  }

  private async sendPushNotifications(
    recipientIds: string[],
    sender: IUser,
    content: string,
    type: string,
    orgId?: string
  ): Promise<boolean> {
    try {
      const fcmTokens = await FCMToken.find({ user: { $in: recipientIds } });

      if (fcmTokens.length === 0) {
        Logger.warn(
          `No FCM tokens found for recipients: ${recipientIds.join(", ")}`
        );
        return false;
      }

      const notificationPayload: any = {
        notification: {
          title: `New message from ${sender.firstName} ${sender.lastName}`,
          body: content.substring(0, 100), // Truncate long messages
        },
        data: {
          type: type,
          senderId: sender._id.toString(),
          senderName: `${sender.firstName} ${sender.lastName}`,
          messageContent: content,
        },
      };

      const tokens = fcmTokens.map((token) => token.token);
      await this.pushSvc.sendToMultipleDevices(tokens, notificationPayload);

      // Save historic notification
      await this.saveHistoricNotification(
        orgId, // Assuming the first org role is the relevant one
        type,
        "medium", // You might want to adjust priority based on message type
        notificationPayload.notification.title,
        notificationPayload.notification.body,
        {
          ...notificationPayload.data,
          recipientIds: recipientIds,
        },
        { users: recipientIds },
        sender._id.toString()
      );

      Logger.info(
        `Push notifications sent to ${tokens.length} devices for message type: ${type}`
      );
      return true;
    } catch (error) {
      Logger.error("Error sending push notifications:", error);
      return false;
    }
  }

  private async saveHistoricNotification(
    organizationId: string,
    type: string,
    priority: "low" | "medium" | "high",
    title: string,
    content: string,
    metadata: Record<string, any>,
    recipients: {
      roles?: string[];
      users?: string[];
      everyone?: boolean;
    },
    createdBy: string
  ): Promise<void> {
    try {
      await this.notificationSvc.createNotification({
        organization: organizationId,
        type,
        priority,
        title,
        content,
        metadata,
        recipients,
        createdBy,
      });
      Logger.info("Historic notification saved successfully");
    } catch (error) {
      Logger.error("Error saving historic notification:", error);
    }
  }
}

export default new ChatService();
