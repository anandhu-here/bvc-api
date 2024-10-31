import { Types } from "mongoose";
import { RolePermissions } from "src/configs/Permissions";
import { Role, RoleToStaffType, StaffType } from "src/configs/Role";
import type { IOrgInvitation } from "src/interfaces/entities/org-invitation";
import {
  Organization,
  OrganizationRole,
  User,
  type IOrganization,
  type IOrganizationRole,
  type IUser,
} from "src/models/new/Heirarchy";
import OrgInvitation from "src/models/OrgInvitation";
import EmailServices from "./EmailService";
import PushNotification from "./PushNotificationService";
import { FCMToken } from "src/models/new/FCM";
import { getLinkConfirmationTemplate } from "src/modules/email/templates/orgLinkConfirmation";
import { getJoinRequestTemplate } from "src/modules/email/templates/orgJoinrequest";
// roleHierarchy.ts
const roleHierarchy = [
  "owner",
  "admin",
  "manager",
  "supervisor",
  "staff",
  "nurse",
  "intern",
  "carer",
];

interface RoleWithOrg {
  role: string;
  organization: IOrganization;
  permissions?: string[];
  staffType?: string;
}

interface HighestLowestRoles {
  highest: RoleWithOrg;
  lowest: RoleWithOrg;
}

class OrganizationServices {
  private roleHierarchy = roleHierarchy;
  private pushNotification: PushNotification;
  private emailServices: EmailServices;

  constructor() {
    this.pushNotification = PushNotification.getInstance();
    this.emailServices = new EmailServices();
  }

  async getOrganization(organizationId: string): Promise<IOrganization> {
    return Organization.findById(organizationId).lean();
  }

  async createOrganization(
    orgData: Partial<IOrganization>
  ): Promise<IOrganization> {
    const org = await Organization.create(orgData);
    await this.notifyAdmins(
      org._id.toString(),
      "New Organization Created",
      `A new organization "${org.name}" has been created.`
    );
    return org;
  }

  async updateOrganization(
    organizationId: string,
    orgData: Partial<IOrganization>
  ): Promise<IOrganization> {
    const org = await Organization.findByIdAndUpdate(organizationId, orgData, {
      new: true,
    });
    await this.notifyAdmins(
      organizationId,
      "Organization Updated",
      `The organization "${org.name}" has been updated.`
    );
    return org;
  }

  async addUserToOrganization(
    userId: string,
    organizationId: string,
    roleString: string
  ): Promise<IOrganizationRole> {
    const [user, organization] = await Promise.all([
      User.findById(userId),
      Organization.findById(organizationId),
    ]);

    if (!user || !organization) {
      throw new Error("User or Organization not found");
    }

    const role = roleString as Role;
    if (!Object.values(Role).includes(role)) {
      throw new Error("Invalid role");
    }

    const permissions = RolePermissions[role] || [];
    const staffType = RoleToStaffType[role];

    const orgRole = new OrganizationRole({
      user: userId,
      organization: organizationId,
      role: role,
      permissions: permissions,
      staffType: staffType,
    });

    await Promise.all([
      orgRole.save(),
      User.findByIdAndUpdate(userId, {
        $push: { organizationRoles: orgRole._id },
      }),
      Organization.findByIdAndUpdate(organizationId, {
        $push: { staff: user._id },
      }),
    ]);

    await this.notifyAdmins(
      organizationId,
      "New User Added",
      `${user.firstName} ${user.lastName} has been added to the organization with the role of ${role}.`
    );
    await this.notifyUser(
      userId,
      "Added to Organization",
      `You have been added to ${organization.name} with the role of ${role}.`
    );

    return orgRole;
  }

  async getCareStaff(organizationId: string): Promise<IOrganizationRole[]> {
    const careRoles = Object.entries(RoleToStaffType)
      .filter(([_, staffType]) => staffType === StaffType.CARE)
      .map(([role, _]) => role);

    return OrganizationRole.find({
      organization: organizationId,
      role: { $in: careRoles },
    })
      .populate("user")
      .lean();
  }

  async getAdminStaff(organizationId: string): Promise<IOrganizationRole[]> {
    const adminRoles = Object.entries(RoleToStaffType)
      .filter(([_, staffType]) => staffType === StaffType.ADMIN)
      .map(([role, _]) => role);

    return OrganizationRole.find({
      organization: organizationId,
      role: { $in: adminRoles },
    })
      .populate("user")
      .lean();
  }

  async createLinkInvitation(
    fromOrgId: string,
    toOrgId: string
  ): Promise<IOrgInvitation> {
    const invitation = await OrgInvitation.create({
      fromOrganization: fromOrgId,
      toOrganization: toOrgId,
    });

    const [fromOrg, toOrg] = await Promise.all([
      Organization.findById(fromOrgId),
      Organization.findById(toOrgId),
    ]);

    await this.notifyAdmins(
      toOrgId,
      "New Link Invitation",
      `${fromOrg.name} has sent a link invitation to your organization.`
    );

    return invitation;
  }

  async getLinkInvitations(organizationId: string): Promise<IOrgInvitation[]> {
    return OrgInvitation.find({
      $or: [
        { fromOrganization: organizationId },
        { toOrganization: organizationId },
      ],
      status: "pending",
    })
      .populate("fromOrganization toOrganization")
      .lean();
  }

  async respondToLinkInvitation(
    invitationId: string,
    accept: boolean
  ): Promise<void> {
    const invitation = await OrgInvitation.findByIdAndUpdate(
      invitationId,
      { status: accept ? "accepted" : "rejected" },
      { new: true }
    );

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const [fromOrg, toOrg] = await Promise.all([
      Organization.findById(invitation.fromOrganization),
      Organization.findById(invitation.toOrganization),
    ]);

    const notificationTitle = accept
      ? "Link Invitation Accepted"
      : "Link Invitation Rejected";
    const notificationBody = accept
      ? `${toOrg.name} has accepted your link invitation.`
      : `${toOrg.name} has rejected your link invitation.`;

    await this.notifyAdmins(
      invitation.fromOrganization.toString(),
      notificationTitle,
      notificationBody
    );

    if (accept) {
      await this.linkOrganizations(
        invitation.fromOrganization.toString(),
        invitation.toOrganization.toString()
      );

      // Send link confirmation email to both organizations
      const htmlContent = getLinkConfirmationTemplate(
        fromOrg.name,
        toOrg.name,
        "Your Company Name"
      );
      await this.notifyAdminsWithCustomEmail(
        invitation.fromOrganization.toString(),
        "Organization Link Confirmed",
        htmlContent
      );
      await this.notifyAdminsWithCustomEmail(
        invitation.toOrganization.toString(),
        "Organization Link Confirmed",
        htmlContent
      );
    }
  }

  async linkOrganizations(
    organizationId1: string,
    organizationId2: string
  ): Promise<void> {
    await Promise.all([
      Organization.findByIdAndUpdate(organizationId1, {
        $addToSet: { linkedOrganizations: organizationId2 },
      }),
      Organization.findByIdAndUpdate(organizationId2, {
        $addToSet: { linkedOrganizations: organizationId1 },
      }),
    ]);

    const [org1, org2] = await Promise.all([
      Organization.findById(organizationId1),
      Organization.findById(organizationId2),
    ]);

    await Promise.all([
      this.notifyAdmins(
        organizationId1,
        "Organizations Linked",
        `Your organization has been linked with ${org2.name}.`
      ),
      this.notifyAdmins(
        organizationId2,
        "Organizations Linked",
        `Your organization has been linked with ${org1.name}.`
      ),
    ]);
  }

  async unlinkOrganizations(
    organizationId1: string,
    organizationId2: string
  ): Promise<void> {
    await Promise.all([
      Organization.findByIdAndUpdate(organizationId1, {
        $pull: { linkedOrganizations: organizationId2 },
      }),
      Organization.findByIdAndUpdate(organizationId2, {
        $pull: { linkedOrganizations: organizationId1 },
      }),
    ]);

    const [org1, org2] = await Promise.all([
      Organization.findById(organizationId1),
      Organization.findById(organizationId2),
    ]);

    await Promise.all([
      this.notifyAdmins(
        organizationId1,
        "Organizations Unlinked",
        `Your organization has been unlinked from ${org2.name}.`
      ),
      this.notifyAdmins(
        organizationId2,
        "Organizations Unlinked",
        `Your organization has been unlinked from ${org1.name}.`
      ),
    ]);
  }

  async getOrganisationByOwner(userId: string): Promise<IOrganization> {
    return Organization.findOne({ owner: userId }).lean();
  }

  async getOrganizationRole(
    userId: string,
    organizationId: string
  ): Promise<IOrganizationRole> {
    console.log(userId, organizationId, "pari");
    return OrganizationRole.findOne({
      user: userId,
      organization: organizationId,
    }).lean();
  }

  async getOrganizationListing(): Promise<IOrganization[]> {
    return Organization.find().select("name").lean();
  }

  async getOrganizationRoleHeirarchy(
    userId: string,
    organizationId: string
  ): Promise<IOrganizationRole[]> {
    return OrganizationRole.find({
      user: userId,
      organization: organizationId,
    }).lean();
  }

  async getOrganizationsByUser(userId: string): Promise<IOrganization[]> {
    const user = await User.findById(userId)
      .populate({
        path: "organizationRoles",
        populate: { path: "organization" },
        select: "organization role",
      })
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    return user.organizationRoles
      .map((role: any) => role.organization)
      .filter((org): org is IOrganization => org !== null && org !== undefined);
  }

  async getOrganizationStaff(organizationId: string): Promise<IUser[]> {
    const organization = await Organization.findById(organizationId)
      .populate("staff")
      .lean();
    if (!organization) {
      throw new Error("Organization not found");
    }

    return organization.staff as any;
  }

  async updateUserRole(
    userId: string,
    organizationId: string,
    newRole: string
  ): Promise<IOrganizationRole> {
    const orgRole = await OrganizationRole.findOneAndUpdate(
      { user: userId, organization: organizationId },
      { role: newRole },
      { new: true }
    );

    if (!orgRole) {
      throw new Error("User role in organization not found");
    }

    const user = await User.findById(userId);
    const organization = await Organization.findById(organizationId);

    await this.notifyAdmins(
      organizationId,
      "User Role Updated",
      `${user.firstName} ${user.lastName}'s role has been updated to ${newRole} in ${organization.name}.`
    );
    await this.notifyUser(
      userId,
      "Your Role Updated",
      `Your role in ${organization.name} has been updated to ${newRole}.`
    );

    return orgRole;
  }

  async removeUserFromOrganization(
    userId: string,
    organizationId: string
  ): Promise<void> {
    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: {
          organizationRoles: {
            $in: await OrganizationRole.find({
              user: userId,
              organization: organizationId,
            }).distinct("_id"),
          },
        },
      }),
      Organization.findByIdAndUpdate(organizationId, {
        $pull: { staff: userId },
      }),
      OrganizationRole.deleteOne({
        user: userId,
        organization: organizationId,
      }),
    ]);

    const user = await User.findById(userId);
    const organization = await Organization.findById(organizationId);

    await this.notifyAdmins(
      organizationId,
      "User Removed",
      `${user.firstName} ${user.lastName} has been removed from ${organization.name}.`
    );
    await this.notifyUser(
      userId,
      "Removed from Organization",
      `You have been removed from ${organization.name}.`
    );
  }
  async sendJoinRequest(userId: string, organizationId: string): Promise<void> {
    const [user, organization] = await Promise.all([
      User.findById(userId),
      Organization.findById(organizationId),
    ]);

    if (!user || !organization) {
      throw new Error("User or Organization not found");
    }

    // Here you would typically create a join request record in your database
    // For example: await JoinRequest.create({ user: userId, organization: organizationId });

    const htmlContent = getJoinRequestTemplate(
      `${user.firstName} ${user.lastName}`,
      user.email,
      organization.name,
      "Your Company Name"
    );

    await this.notifyAdminsWithCustomEmail(
      organizationId,
      `New Join Request for ${organization.name}`,
      htmlContent
    );
  }
  private async notifyAdminsWithCustomEmail(
    organizationId: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    const adminRoles = (await OrganizationRole.find({
      organization: organizationId,
      role: "admin",
    })
      .populate("user")
      .lean()) as any[];

    for (const role of adminRoles) {
      await this.emailServices.sendEmail({
        to: role.user.email,
        subject: subject,
        html: htmlContent,
      });
    }

    // You can also send push notifications here if needed
    const adminUserIds = adminRoles.map((role) => role.user._id);
    const fcmTokens = await FCMToken.find({ user: { $in: adminUserIds } });
    const tokens = fcmTokens.map((fcm) => fcm.token);

    if (tokens.length > 0) {
      await this.pushNotification.sendToMultipleDevices(tokens, {
        notification: {
          title: subject,
          body: "You have received a new notification. Please check your email for details.",
        },
        data: { organizationId },
      });
    }
  }

  async getLinkedOrganizationAdmins(
    organizationId: string,
    currentUserId: Types.ObjectId
  ): Promise<any[]> {
    const linkedOrganizations = await this.getLinkedOrganizations(
      organizationId
    );
    const linkedOrganizationIds = linkedOrganizations.map(
      (org) => new Types.ObjectId(org._id)
    );

    const admins = await OrganizationRole.aggregate([
      {
        $match: {
          organization: { $in: linkedOrganizationIds },
          role: "admin",
          user: { $ne: currentUserId },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organization",
        },
      },
      { $unwind: "$organization" },
      {
        $lookup: {
          from: "messages",
          let: { userId: "$user._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender", "$$userId"] },
                    { $eq: ["$receiver", currentUserId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: null,
                unreadCount: {
                  $sum: {
                    $cond: [{ $in: [currentUserId, "$readBy"] }, 0, 1],
                  },
                },
                lastMessage: { $first: "$$ROOT" },
              },
            },
          ],
          as: "messageInfo",
        },
      },
      {
        $addFields: {
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ["$messageInfo.unreadCount", 0] }, 0],
          },
          lastMessage: {
            $ifNull: [{ $arrayElemAt: ["$messageInfo.lastMessage", 0] }, null],
          },
        },
      },
      {
        $project: {
          "user._id": 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.email": 1,
          "organization._id": 1,
          "organization.name": 1,
          unreadCount: 1,
          "lastMessage.content": 1,
          "lastMessage.createdAt": 1,
        },
      },
    ]);

    return admins;
  }

  async getLinkedOrganizationAdminForCarer(
    organizationId: string,
    currentUserId: Types.ObjectId
  ): Promise<any[]> {
    const orgRoles = await OrganizationRole.aggregate([
      {
        $match: {
          organization: new Types.ObjectId(organizationId),
          role: { $in: ["admin", "owner"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organization",
        },
      },
      { $unwind: "$organization" },
      {
        $lookup: {
          from: "messages",
          let: { userId: "$user._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender", "$$userId"] },
                    { $eq: ["$receiver", currentUserId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: null,
                unreadCount: {
                  $sum: {
                    $cond: [{ $in: [currentUserId, "$readBy"] }, 0, 1],
                  },
                },
                lastMessage: { $first: "$$ROOT" },
              },
            },
          ],
          as: "messageInfo",
        },
      },
      {
        $addFields: {
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ["$messageInfo.unreadCount", 0] }, 0],
          },
          lastMessage: {
            $ifNull: [{ $arrayElemAt: ["$messageInfo.lastMessage", 0] }, null],
          },
        },
      },
      {
        $project: {
          "user._id": 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.email": 1,
          "organization._id": 1,
          "organization.name": 1,
          unreadCount: 1,
          "lastMessage.content": 1,
          "lastMessage.createdAt": 1,
        },
      },
    ]);

    return orgRoles;
  }

  async getLinkedOrganizationById(
    organizationId: string,
    currentOrganizationId: string
  ): Promise<IOrganization | null> {
    // find the currentOrganizationId in the linkedOrganizations array of the organization and if it is there then return the organization
    const currentOrganization = await Organization.findById(
      currentOrganizationId
    ).lean();

    if (!currentOrganization) {
      throw new Error("Organization not found");
    }

    const linkedOrganizations =
      currentOrganization.linkedOrganizations as any[];

    const linkedOrganization = linkedOrganizations.find(
      (org) => org._id.toString() === organizationId
    );

    return await Organization.findById(organizationId)
      .select("name email type status logoUrl address _id")
      .lean();
  }

  async getLinkedOrganizations(
    organizationId: string,
    type?: string
  ): Promise<IOrganization[]> {
    console.log("organizationId", organizationId);
    const organization = await Organization.findById(organizationId).populate({
      path: "linkedOrganizations",
      select: "name email type status logoUrl _id",
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    let linkedOrganizations = organization.linkedOrganizations as any[];

    if (type) {
      linkedOrganizations = linkedOrganizations.filter(
        (org) => org.type === type
      );
    }

    return linkedOrganizations;
  }

  private getRoleRank(role: string): number {
    return this.roleHierarchy.indexOf(role);
  }

  async getUserRoles(userId: string): Promise<IUser | null> {
    return User.findById(userId).populate({
      path: "organizationRoles",
      populate: { path: "organization" },
      select: "organization role permissions staffType",
    });
  }

  async getCareStaffs(organizationId: string): Promise<IUser[]> {
    return [];
  }

  getHighestAndLowestRoles(roles: IOrganizationRole[]): HighestLowestRoles {
    if (roles.length === 0) {
      return {
        highest: {
          role: "",
          organization: null,
          permissions: [],
          staffType: "",
        },
        lowest: {
          role: "",
          organization: null,
          permissions: [],
          staffType: "",
        },
      };
    }

    let highestRank = Infinity;
    let lowestRank = -1;
    let highest: RoleWithOrg = {
      role: "",
      organization: null,
      permissions: [],
    };
    let lowest: RoleWithOrg = {
      role: "",
      organization: null,
      permissions: [],
    };

    for (const roleObj of roles) {
      const rank = this.getRoleRank(roleObj.role);
      if (rank !== -1) {
        if (rank < highestRank) {
          highestRank = rank;
          highest = {
            role: roleObj.role,
            organization: roleObj.organization as any,
            permissions: roleObj.permissions,
            staffType: roleObj.staffType,
          };
        }
        if (rank > lowestRank) {
          lowestRank = rank;
          lowest = {
            role: roleObj.role,
            organization: roleObj.organization as any,
            permissions: roleObj.permissions,
            staffType: roleObj.staffType,
          };
        }
      }
    }

    return { highest, lowest };
  }

  async getUserHighestAndLowestRoles(
    userId: string
  ): Promise<HighestLowestRoles> {
    const user = await this.getUserRoles(userId);
    if (!user || !user.organizationRoles) {
      return {
        highest: {
          role: "",
          organization: null,
          permissions: [],
          staffType: "",
        },
        lowest: {
          role: "",
          organization: null,
          permissions: [],
          staffType: "",
        },
      };
    }

    const roles = user.organizationRoles as any[];

    return this.getHighestAndLowestRoles(roles);
  }

  async searchOrganizations(
    searchTerm: string,
    excludeType?: string
  ): Promise<Pick<IOrganization, "name" | "type">[]> {
    const regex = new RegExp(searchTerm, "i");
    const query: any = { name: { $regex: regex } };

    if (excludeType) {
      query.type = { $ne: excludeType };
    }

    return Organization.find(query, {
      name: 1,
      type: 1,
      _id: 1,
      logoUrl: 1,
    }).lean();
  }

  private async notifyAdmins(
    organizationId: string,
    title: string,
    body: string
  ): Promise<void> {
    const adminRoles = (await OrganizationRole.find({
      organization: organizationId,
      role: "admin",
    })
      .populate("user")
      .lean()) as any[];

    const adminUserIds = adminRoles.map((role) => role.user._id);

    const fcmTokens = await FCMToken.find({ user: { $in: adminUserIds } });

    const tokens = fcmTokens.map((fcm) => fcm.token);

    if (tokens.length > 0) {
      await this.pushNotification.sendToMultipleDevices(tokens, {
        notification: { title, body },
        data: { organizationId },
      });
    }

    // Send emails to admins
    for (const role of adminRoles) {
      await this.emailServices.sendEmail({
        to: role.user.email,
        subject: title,
        text: body,
        html: `<p>${body}</p>`,
      });
    }
  }

  private async notifyUser(
    userId: string,
    title: string,
    body: string
  ): Promise<void> {
    const fcmTokens = await FCMToken.find({ user: userId });
    const tokens = fcmTokens.map((fcm) => fcm.token);

    if (tokens.length > 0) {
      await this.pushNotification.sendToMultipleDevices(tokens, {
        notification: { title, body },
      });
    }

    const user = await User.findById(userId);
    if (user) {
      await this.emailServices.sendEmail({
        to: user.email,
        subject: title,
        text: body,
        html: `<p>${body}</p>`,
      });
    }
  }
}

export default OrganizationServices;
