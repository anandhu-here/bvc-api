import WebSocketApp from "src/app/WebSocketApp";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import ChatService from "src/services/ChatService";
import PushNotification from "src/services/PushNotificationService";
import UserService from "src/services/UserService";
import { FCMToken } from "src/models/new/FCM";
import Logger from "src/logger";
import { User } from "src/models/new/Heirarchy";

class ChatController {
  private readonly usrSvc: UserService;
  private readonly pushSvc: PushNotification;

  constructor() {
    this.usrSvc = new UserService();
    this.pushSvc = PushNotification.getInstance();
  }

  public getBroadcastMessages = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { limit, before } = req.query;

      const messages = await ChatService.getBroadcastMessages(
        orgId,
        limit ? parseInt(limit as string) : undefined,
        before ? new Date(before as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      Logger.error("Error in getBroadcastMessages:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public broadcastMessage = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { senderId, content, messageType = "text", orgId } = req.body;

      const senderUser = await User.findById(senderId);

      if (!senderUser) {
        throw new Error("Invalid sender");
      }

      const storedMessage = await ChatService.storeBroadcastMessage(
        senderId,
        content,
        messageType,
        orgId
      );

      const wsMessage = {
        _id: storedMessage._id.toString(),
        sender: {
          _id: senderUser._id.toString(),
          firstName: senderUser.firstName,
          lastName: senderUser.lastName,
          avatarUrl: senderUser.avatarUrl || null,
        },
        content: storedMessage.content,
        messageType: storedMessage.messageType,
        createdAt: storedMessage.createdAt.toISOString(),
        readBy: storedMessage.readBy.map((id) => id.toString()),
        orgId: orgId || null,
        isBroadcast: true,
        isGlobal: true,
      };

      // Send the message through WebSocket
      const wsApp = WebSocketApp.getInstance();
      wsApp.broadcastMessage(wsMessage);

      // Send push notifications
      const recipients = await ChatService.getBroadcastRecipients(orgId);
      const fcmTokens = await FCMToken.find({
        user: { $in: recipients.map((r) => r._id) },
      });

      const notificationPayload = {
        notification: {
          title: "Broadcast Message",
          body: `${senderUser.firstName} sent a broadcast message`,
        },
        data: {
          type: "BROADCAST_MESSAGE",
          senderId: senderUser._id.toString(),
          orgId: orgId || "",
        },
      };

      await this.pushSvc.sendToMultipleDevices(
        fcmTokens.map((token) => token.token),
        notificationPayload
      );

      res.status(200).json({
        success: true,
        message: "Broadcast message sent and stored",
        data: wsMessage,
      });
    } catch (error) {
      Logger.error("Error in broadcastMessage:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public sendMessage = async (req: IRequest, res: IResponse): Promise<void> => {
    try {
      const {
        senderId,
        recipientId,
        content,
        messageType = "text",
        orgId,
      } = req.body;

      // Fetch full user objects
      const senderUser = await User.findById(senderId).lean();
      const recipientUser = await User.findById(recipientId).lean();

      if (!senderUser || !recipientUser) {
        throw new Error("Invalid sender or recipient");
      }

      const { message: storedMessage, notificationSent } =
        await ChatService.storeMessage(
          senderId,
          recipientId,
          content,
          messageType,
          orgId
        );

      const wsMessage = {
        _id: storedMessage._id.toString(),
        sender: {
          _id: senderUser._id.toString(),
          firstName: senderUser.firstName,
          lastName: senderUser.lastName,
          avatarUrl: senderUser.avatarUrl,
        },
        receiver: {
          _id: recipientUser._id.toString(),
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          avatarUrl: recipientUser.avatarUrl,
        },
        content: storedMessage.content,
        messageType: storedMessage.messageType,
        createdAt: storedMessage.createdAt.toISOString(),
        readBy: storedMessage.readBy.map((id) => id.toString()),
        orgId: orgId,
      };

      // Send the message through WebSocket
      const wsApp = WebSocketApp.getInstance();
      wsApp.sendChatMessage(wsMessage);

      res.status(200).json({
        success: true,
        message: "Message sent and stored",
        data: wsMessage,
        notificationSent,
      });
    } catch (error) {
      Logger.error("Error in sendMessage:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public getMessages = async (req: IRequest, res: IResponse): Promise<void> => {
    try {
      const { otherUserId } = req.params;
      const { page = "1", limit = "20" } = req.query;

      const userId = req.user._id;

      const { messages, totalCount, totalPages } =
        await ChatService.getMessages(
          userId.toString(),
          otherUserId,
          parseInt(page as string),
          parseInt(limit as string)
        );

      res.status(200).json({
        success: true,
        data: {
          messages,
          currentPage: parseInt(page as string),
          totalPages,
          totalCount,
        },
      });
    } catch (error) {
      Logger.error("Error in getMessages:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public markAsRead = async (req: IRequest, res: IResponse): Promise<void> => {
    try {
      const { messageId } = req.params;
      const userId = req.user._id;

      await ChatService.markMessageAsRead(messageId, userId.toString());

      res
        .status(200)
        .json({ success: true, message: "Message marked as read" });
    } catch (error) {
      Logger.error("Error in markAsRead:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public getUnreadCount = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.user._id;

      const count = await ChatService.getUnreadMessageCount(userId.toString());

      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error) {
      Logger.error("Error in getUnreadCount:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public sendGlobalMessage = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const {
        senderId,
        recipient,
        content,
        messageType = "text",
        orgId,
      } = req.body;

      const senderUser = await User.findById(senderId).lean();

      if (!senderUser) {
        throw new Error("Invalid sender");
      }

      // Store the global message
      const storedMessage = await ChatService.storeGlobalMessage(
        senderId,
        recipient,
        content,
        messageType,
        orgId
      );

      // Send the message through WebSocket
      const wsApp = WebSocketApp.getInstance();
      const linkedUsers = await ChatService.getLinkedUsers(recipient, senderId);

      linkedUsers.forEach((user) => {
        wsApp.sendChatMessage({
          ...storedMessage.toObject(),
          sender: {
            _id: storedMessage.sender.toString(),
            firstName: senderUser.firstName,
            lastName: senderUser.lastName,
          },
          receiver: {
            _id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
          },
          orgId: orgId,
        });
      });

      // Send push notifications
      const recipientTokens = await FCMToken.find({
        user: { $in: linkedUsers.map((u) => u._id) },
      });

      const notificationPayload = {
        notification: {
          title: "New Global Message",
          body: `${senderUser.firstName} sent a global message`,
        },
        data: {
          type: "GLOBAL_MESSAGE",
          senderId: senderUser._id.toString(),
          orgId: orgId || "",
        },
      };

      await this.pushSvc.sendToMultipleDevices(
        recipientTokens.map((token) => token.token),
        notificationPayload
      );

      res.status(200).json({
        success: true,
        message: "Global message sent and stored",
        data: storedMessage,
      });
    } catch (error) {
      Logger.error("Error in sendGlobalMessage:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public markAllAsRead = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { otherUserId } = req.params;
      const userId = req.user._id;

      await ChatService.markAllMessagesAsRead(userId.toString(), otherUserId);

      res
        .status(200)
        .json({ success: true, message: "All messages marked as read" });
    } catch (error) {
      Logger.error("Error in markAllAsRead:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };

  public getGlobalMessages = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { homeId } = req.params;
      const { limit, before } = req.query;

      const messages = await ChatService.getGlobalMessages(
        homeId,
        limit ? parseInt(limit as string) : undefined,
        before ? new Date(before as string) : null
      );

      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      Logger.error("Error in getGlobalMessages:", error);
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  };
}

export default new ChatController();
