import { JoinRequest, type IJoinRequest } from "src/models/new/JoinRequest";
import AuthService from "./AuthServices";
import EmailServices from "../EmailService";
import OrganizationServices from "../OrgServices";
import { Organization, OrganizationRole, User } from "src/models/new/Heirarchy";
import { getJoinRequestTemplate } from "src/modules/email/templates/join-requests";
import Logger from "src/logger";
import PushNotification from "../PushNotificationService";
import { FCMToken } from "src/models/new/FCM";
import { getJoinRequestAcceptedTemplate } from "src/modules/email/templates/acceptedJoinRequest";

import { Types } from "mongoose";
import HistoricNotificationService from "../HistoricNotifications";
import { NotificationHistory } from "src/models/Notifications";

class JoinRequestServices {
  private authSvc: AuthService;
  private mailSvc: EmailServices;
  private orgSvc: OrganizationServices;
  private pushSvc: PushNotification;
  private notificationSvc: HistoricNotificationService;

  constructor() {
    this.authSvc = new AuthService();
    this.mailSvc = new EmailServices();
    this.orgSvc = new OrganizationServices();
    this.pushSvc = PushNotification.getInstance();
    this.notificationSvc = new HistoricNotificationService();
  }

  private async saveNotificationHistory(
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
      Logger.info("Saving notification history:", {
        organizationId,
        type,
        title,
      });
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
    } catch (error) {
      Logger.error(`Error saving notification history: ${error}`);
    }
  }

  async createJoinRequest(data: IJoinRequest) {
    const request = await JoinRequest.create(data);
    try {
      const org = await Organization.findById(data.organization);
      const user = await User.findById(data.user);

      if (!org || !user) {
        throw new Error("Organization or User not found");
      }

      await this.sendJoinRequestEmail(user, org);
      await this.sendNewJoinRequestNotification(org._id.toString(), user, org);
    } catch (error) {
      Logger.error("Error in createJoinRequest:", error);
      // Consider adding more robust error handling here
    }
    return request;
  }

  private async sendJoinRequestEmail(user: any, org: any) {
    const redirectLink = `${process.env.FRONTEND_URL}/invitations`;
    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/wyecare-frontend.appspot.com/o/wyecare-logo-dark.png?alt=media&token=c83fb0b1-a841-4c22-a089-9185581eeef6";

    const emailHtml = getJoinRequestTemplate(
      `${user.firstName} ${user.lastName}`,
      org.name,
      redirectLink,
      logoUrl
    );

    await this.mailSvc.sendEmail({
      to: org.email,
      subject: "New Join Request",
      html: emailHtml,
    });
  }

  private async sendNewJoinRequestNotification(
    organizationId: string,
    requestingUser: any,
    organization: any
  ) {
    try {
      // Fetch all admin roles for the organization
      const adminRoles = await OrganizationRole.find({
        organization: organizationId,
        role: "admin",
      });

      if (adminRoles.length === 0) {
        Logger.warn(`No admin roles found for organization: ${organizationId}`);
        return;
      }

      const adminUserIds = adminRoles.map((role) => role.user.toString());

      // Fetch FCM tokens for all admin users
      const adminTokens = await FCMToken.find({
        user: { $in: adminUserIds },
      });

      if (adminTokens.length === 0) {
        Logger.warn(
          `No FCM tokens found for admins of organization: ${organizationId}`
        );
        return;
      }

      const notificationPayload = {
        notification: {
          title: "New Join Request",
          body: `${requestingUser.firstName} ${requestingUser.lastName} has requested to join ${organization.name}.`,
        },
        data: {
          organizationId: organization._id.toString(),
          requestingUserId: requestingUser._id.toString(),
          type: "NEW_JOIN_REQUEST",
          url: `${process.env.FRONTEND_URL}`,
        },
      };
      await this.saveNotificationHistory(
        organizationId,
        "NEW_JOIN_REQUEST",
        "medium",
        notificationPayload.notification.title,
        notificationPayload.notification.body,
        notificationPayload.data,
        { roles: ["admin"] },
        requestingUser._id.toString()
      );

      const tokens = adminTokens.map((token) => token.token);
      await this.pushSvc.sendToMultipleDevices(tokens, notificationPayload);

      Logger.info(
        `Join request notification sent to ${tokens.length} admin devices for organization ${organizationId}`
      );
    } catch (error) {
      Logger.error(
        `Error sending join request notification for organization ${organizationId}:`,
        error
      );
    }
  }

  async acceptJoinRequestForUser(userId: string, organizationId: string) {
    const updatedRequest = await JoinRequest.findOneAndUpdate(
      { user: userId, organization: organizationId },
      { status: "accept" },
      { new: true }
    );

    await NotificationHistory.findOneAndDelete({
      type: "NEW_JOIN_REQUEST",
      createdBy: userId,
    });

    if (updatedRequest) {
      await this.sendJoinRequestAcceptedNotification(userId, organizationId);
    }

    return updatedRequest;
  }

  private async sendJoinRequestAcceptedNotification(
    userId: string,
    organizationId: string
  ) {
    try {
      Logger.info(
        `Sending join request accepted notification for user ${userId} and organization ${organizationId}`
      );
      const user = await User.findById(userId);
      const organization = await Organization.findById(organizationId);

      if (!user || !organization) {
        Logger.error("User or organization not found for notification");
        return;
      }

      const userTokens = await FCMToken.find({ user: userId });

      if (userTokens.length === 0) {
        Logger.warn(
          `No FCM tokens found for user: ${userId}. Sending email notification instead.`
        );
        await this.sendJoinRequestAcceptedEmail(user, organization);
        return;
      }

      const notificationPayload = {
        notification: {
          title: "Join Request Accepted",
          body: `Your request to join ${organization.name} has been accepted!`,
        },
        data: {
          organizationId: organizationId,
          type: "JOIN_REQUEST_ACCEPTED",
          url: `${process.env.FRONTEND_URL}/organization/${organizationId}`,
        },
      };

      const tokens = userTokens.map((token) => token.token);
      await this.pushSvc.sendToMultipleDevices(tokens, notificationPayload);
      Logger.info(`Join request accepted notification sent to user ${userId}`);
    } catch (error) {
      Logger.error("Error in sendJoinRequestAcceptedNotification:", error);
    }
  }
  private async sendJoinRequestAcceptedEmail(user: any, organization: any) {
    const redirectLink = `${process.env.FRONTEND_URL}/organization/${organization._id}`;
    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/wyecare-frontend.appspot.com/o/wyecare-logo-dark.png?alt=media&token=c83fb0b1-a841-4c22-a089-9185581eeef6";

    const emailHtml = getJoinRequestAcceptedTemplate(
      `${user.firstName} ${user.lastName}`,
      organization.name,
      redirectLink,
      logoUrl
    );

    await this.mailSvc.sendEmail({
      to: user.email,
      subject: "Join Request Accepted",
      html: emailHtml,
    });

    Logger.info(`Join request accepted email sent to user ${user._id}`);
  }

  // Other methods remain the same
  async getOrgJoinRequests(organizationId: string) {
    return await JoinRequest.find({
      organization: organizationId,
      status: "pending",
    })
      .populate("user")
      .populate("organization")
      .lean();
  }

  async getJoinRequestById(id: string) {
    return await JoinRequest.findById(id)
      .populate("organization")
      .populate("user");
  }

  async getJoinRequestsByOrganization(organizationId: string) {
    return await JoinRequest.find({
      organization: organizationId,
      status: "pending",
    })
      .populate("user")
      .populate("organization");
  }

  async getJoinRequestsByUser(userId: string) {
    return await JoinRequest.find({ user: userId }).populate("organization");
  }

  async getLatestJoinRequestForUser(
    userId: string
  ): Promise<IJoinRequest | null> {
    try {
      return await JoinRequest.findOne({
        user: userId,
        status: "pending",
      })
        .sort({ requestDate: -1 })
        .populate("organization", "name")
        .lean();
    } catch (error: any) {
      Logger.error("Error in getLatestForUser:", error);
      throw error;
    }
  }

  async updateJoinRequestStatus(id: string, status: string) {
    return await JoinRequest.findByIdAndUpdate(id, { status }, { new: true });
  }

  async deleteJoinRequest(id: string) {
    return await JoinRequest.findByIdAndDelete(id);
  }
}

export default JoinRequestServices;
