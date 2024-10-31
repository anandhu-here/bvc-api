import mongoose, { Types } from "mongoose";
import {
  OrganizationRole,
  type IOrganizationRole,
} from "src/models/new/Heirarchy";

class StaffService {
  private async aggregateStaffWithMessages(
    matchStage: any,
    recipientId?: string
  ): Promise<IOrganizationRole[]> {
    const pipeline = [
      { $match: matchStage },
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
          from: "messages",
          let: { staffId: "$user._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender", "$$staffId"] },
                    recipientId
                      ? { $eq: ["$receiver", new Types.ObjectId(recipientId)] }
                      : { $ne: ["$receiver", null] },
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
                    $cond: [
                      recipientId
                        ? { $in: [new Types.ObjectId(recipientId), "$readBy"] }
                        : { $eq: [{ $size: "$readBy" }, 0] },
                      0,
                      1,
                    ],
                  },
                },
                lastMessage: { $first: "$$ROOT" },
              },
            },
            {
              $project: {
                unreadCount: 1,
                lastMessage: {
                  $cond: [
                    { $gt: ["$unreadCount", 0] },
                    {
                      _id: "$lastMessage._id",
                      content: "$lastMessage.content",
                      createdAt: "$lastMessage.createdAt",
                      messageType: "$lastMessage.messageType",
                    },
                    null,
                  ],
                },
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
          messageInfo: 0,
        },
      },
    ];

    return OrganizationRole.aggregate(pipeline as any);
  }

  public async getAllStaff(
    organizationId: string
  ): Promise<IOrganizationRole[]> {
    return this.aggregateStaffWithMessages({
      organization: new Types.ObjectId(organizationId),
    });
  }

  public async removeStaff(
    staffId: string,
    organizationId: string
  ): Promise<void> {
    await OrganizationRole.deleteOne({
      _id: staffId,
      organization: organizationId,
    }).exec();
  }

  public async getCareStaff(
    organizationId: string,
    recipientId: string
  ): Promise<IOrganizationRole[]> {
    return this.aggregateStaffWithMessages(
      {
        organization: new Types.ObjectId(organizationId),
        role: { $in: ["carer", "nurse"] },
      },
      recipientId
    );
  }

  public async getAdminStaff(
    organizationId: string,
    currentUserId: string
  ): Promise<IOrganizationRole[]> {
    return this.aggregateStaffWithMessages({
      organization: new Types.ObjectId(organizationId),
      role: { $in: ["admin", "hr_manager", "accounting_manager"] },
      user: { $ne: new Types.ObjectId(currentUserId) },
    });
  }

  public async getOtherStaff(
    organizationId: string
  ): Promise<IOrganizationRole[]> {
    return this.aggregateStaffWithMessages({
      organization: new Types.ObjectId(organizationId),
      role: {
        $nin: ["carer", "nurse", "admin", "hr_manager", "accounting_manager"],
      },
    });
  }

  public async getStaffByRole(
    organizationId: string,
    role: string
  ): Promise<IOrganizationRole[]> {
    return this.aggregateStaffWithMessages({
      organization: new Types.ObjectId(organizationId),
      role: role,
    });
  }
}

export default StaffService;
