import mongoose, { Types } from "mongoose";
import StatusCodes from "src/constants/statusCodes";
import CustomError from "src/helpers/ErrorHelper";
import Logger from "src/logger";
import { OrganizationRole } from "src/models/new/Heirarchy";
import {
  INotificationHistory,
  NotificationHistory,
} from "src/models/Notifications";

class HistoricNotificationService {
  public async createNotification(notificationData: {
    organization: string;
    type: string;
    priority: "low" | "medium" | "high";
    title: string;
    content: string;
    metadata?: Record<string, any>;
    recipients: {
      roles?: string[];
      users?: string[];
      everyone?: boolean;
    };
    createdBy: string;
  }): Promise<INotificationHistory> {
    try {
      const notification = new NotificationHistory({
        ...notificationData,
        organization: new Types.ObjectId(notificationData.organization),
        createdBy: new Types.ObjectId(notificationData.createdBy),
        recipients: {
          ...notificationData.recipients,
          users: notificationData.recipients.users?.map(
            (id) => new Types.ObjectId(id)
          ),
        },
      });

      await notification.save();
      Logger.info(`Notification created: ${notification._id}`);
      return notification;
    } catch (error) {
      Logger.error("Error creating notification:", error);
      throw new CustomError(
        "Failed to create notification",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getNotifications(
    userId: string,
    organizationId: string,
    options: {
      cursor?: string;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: INotificationHistory[];
    totalCount: number;
    nextCursor: string | null;
  }> {
    try {
      const limit = options.limit || 10;
      const query: any = {
        organization: new Types.ObjectId(organizationId),
        $or: [
          { "recipients.users": new Types.ObjectId(userId) },
          {
            "recipients.roles": {
              $in: await this.getUserRoles(userId, organizationId),
            },
          },
          { "recipients.everyone": true },
        ],
      };

      if (options.cursor) {
        query._id = { $lt: new Types.ObjectId(options.cursor) };
      }

      const [notifications, totalCount] = await Promise.all([
        NotificationHistory.find(query)
          .sort({ createdAt: -1 })
          .limit(limit + 1)
          .exec(),
        NotificationHistory.countDocuments(query),
      ]);

      const hasNextPage = notifications.length > limit;
      const paginatedNotifications = notifications.slice(0, limit);

      return {
        notifications: paginatedNotifications,
        totalCount,
        nextCursor: hasNextPage
          ? paginatedNotifications[
              paginatedNotifications.length - 1
            ]._id.toString()
          : null,
      };
    } catch (error) {
      Logger.error("Error fetching notifications:", error);
      throw new CustomError(
        "Failed to fetch notifications",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotificationHistory> {
    try {
      const notification = await NotificationHistory.findOneAndUpdate(
        { _id: new Types.ObjectId(notificationId) },
        {
          $addToSet: {
            readBy: { userId: new Types.ObjectId(userId), readAt: new Date() },
          },
        },
        { new: true }
      );

      if (!notification) {
        throw new CustomError("Notification not found", StatusCodes.NOT_FOUND);
      }

      Logger.info(`Notification marked as read: ${notificationId}`);
      return notification;
    } catch (error) {
      Logger.error("Error marking notification as read:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(
        "Failed to mark notification as read",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async deleteNotification(
    notificationId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const result = await NotificationHistory.deleteOne({
        _id: new Types.ObjectId(notificationId),
        organization: new Types.ObjectId(organizationId),
        createdBy: new Types.ObjectId(userId),
      });

      if (result.deletedCount === 0) {
        throw new CustomError(
          "Notification not found or you don't have permission to delete it",
          StatusCodes.NOT_FOUND
        );
      }

      Logger.info(`Notification deleted: ${notificationId}`);
    } catch (error) {
      Logger.error("Error deleting notification:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(
        "Failed to delete notification",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getUnreadNotificationCount(
    userId: string,
    organizationId: string
  ): Promise<number> {
    try {
      const userRoles = await this.getUserRoles(userId, organizationId);
      return await NotificationHistory.countDocuments({
        organization: new Types.ObjectId(organizationId),
        $or: [
          { "recipients.users": new Types.ObjectId(userId) },
          { "recipients.roles": { $in: userRoles } },
          { "recipients.everyone": true },
        ],
        readBy: {
          $not: { $elemMatch: { userId: new Types.ObjectId(userId) } },
        },
      });
    } catch (error) {
      Logger.error("Error fetching unread notification count:", error);
      throw new CustomError(
        "Failed to fetch unread notification count",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async markAllAsRead(
    userId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const userRoles = await this.getUserRoles(userId, organizationId);
      await NotificationHistory.updateMany(
        {
          organization: new Types.ObjectId(organizationId),
          $or: [
            { "recipients.users": new Types.ObjectId(userId) },
            { "recipients.roles": { $in: userRoles } },
            { "recipients.everyone": true },
          ],
          readBy: {
            $not: { $elemMatch: { userId: new Types.ObjectId(userId) } },
          },
        },
        {
          $addToSet: {
            readBy: { userId: new Types.ObjectId(userId), readAt: new Date() },
          },
        }
      );
      Logger.info(
        `All notifications marked as read for user: ${userId} in organization: ${organizationId}`
      );
    } catch (error) {
      Logger.error("Error marking all notifications as read:", error);
      throw new CustomError(
        "Failed to mark all notifications as read",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getUserRoles(
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      const userRoles = await OrganizationRole.find({
        user: new Types.ObjectId(userId),
        organization: new Types.ObjectId(organizationId),
      });
      return userRoles.map((role) => role.role);
    } catch (error) {
      Logger.error("Error fetching user roles:", error);
      throw new CustomError(
        "Failed to fetch user roles",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default HistoricNotificationService;
