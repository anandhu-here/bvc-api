import mongoose, { Types } from "mongoose";
import {
  OrganizationRole,
  type IOrganizationRole,
} from "src/models/new/Heirarchy";

import { ShiftPattern } from "src/models/ShiftPattern";
import dayjs from "dayjs";
import CarerApplication from "src/models/CarerApplication";
import CustomError from "src/helpers/ErrorHelper";
import StatusCodes from "src/constants/statusCodes";

const dayMapping = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
} as const;

interface IAvailableStaff {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  role: string;
  organization: Types.ObjectId;
  availability: {
    isAvailable: boolean;
    reason?: string;
  };
}

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

  private getShiftPeriod(
    startTime: string,
    endTime: string
  ): "morning" | "afternoon" | "evening" | "night" {
    const hour = parseInt(startTime.split(":")[0]);

    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
  }

  private getDayOfWeek(date: string): keyof typeof dayMapping {
    const day = dayjs(date).format("dddd").toLowerCase();
    return day as keyof typeof dayMapping;
  }

  private async checkCarerAvailability(
    carerId: string,
    shiftDate: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    console.log(carerId, "carerId");
    const carerApplication = await CarerApplication.findOne({
      userId: new Types.ObjectId(carerId),
    });

    console.log(carerApplication, "carerApplication");
    if (!carerApplication?.availability?.availabilityDetails) return false;

    const dayOfWeek = this.getDayOfWeek(shiftDate);
    console.log(dayOfWeek, "dayOfWeek");
    const shiftPeriod = this.getShiftPeriod(startTime, endTime);
    console.log(shiftPeriod, "shiftPeriod");
    const dayAvailability =
      carerApplication.availability.availabilityDetails[dayOfWeek];

    return !!(dayAvailability?.available && dayAvailability[shiftPeriod]);
  }

  public async getAvailableStaffForShift(
    organizationId: string,
    shiftPatternId: string,
    shiftDate: string,
    careHomeId: string
  ): Promise<IAvailableStaff[]> {
    try {
      // Get shift pattern details
      const shiftPattern = await ShiftPattern.findById(shiftPatternId);
      if (!shiftPattern) {
        throw new CustomError("Shift pattern not found", StatusCodes.NOT_FOUND);
      }

      // Get timing for the specific care home
      const timing = shiftPattern.timings.find(
        (t) => t.careHomeId === careHomeId
      );
      if (!timing) {
        throw new CustomError(
          "No timing found for this care home",
          StatusCodes.NOT_FOUND
        );
      }

      // Get all care staff from the organization
      const careStaff = await OrganizationRole.find({
        organization: new Types.ObjectId(organizationId),
        role: { $in: ["carer", "nurse"] },
      }).populate("user", "firstName lastName role");

      console.log(careStaff, "careStaff");

      // Check availability for each staff member
      const availabilityPromises = careStaff.map(async (staff) => {
        const isAvailable = await this.checkCarerAvailability(
          staff.user._id.toString(),
          shiftDate,
          timing.startTime,
          timing.endTime
        );

        return {
          _id: staff._id,
          user: staff.user,
          role: staff.role,
          organization: staff.organization,
          availability: {
            isAvailable,
            reason: isAvailable
              ? undefined
              : "Not available for this shift period",
          },
        };
      });

      const staffWithAvailability = await Promise.all(availabilityPromises);

      console.log(staffWithAvailability, "staffWithAvailability");

      // Additional filtering based on user type rates if needed
      const userTypeRates = shiftPattern.userTypeRates;
      console.log(userTypeRates, "userTypeRates");
      console.log(userTypeRates.length, "userTypeRates.length");

      return staffWithAvailability;
    } catch (error) {
      throw error;
    }
  }

  public async getStaffAvailabilityForDateRange(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, IAvailableStaff[]>> {
    try {
      const careStaff = await OrganizationRole.find({
        organization: new Types.ObjectId(organizationId),
        role: { $in: ["carer", "nurse"] },
      }).populate("user", "fname lname");

      const dateRange = [];
      let currentDate = dayjs(startDate);
      const lastDate = dayjs(endDate);

      while (
        currentDate.isBefore(lastDate) ||
        currentDate.isSame(lastDate, "day")
      ) {
        dateRange.push(currentDate.format("YYYY-MM-DD"));
        currentDate = currentDate.add(1, "day");
      }

      const availabilityMap: Record<string, IAvailableStaff[]> = {};

      for (const date of dateRange) {
        const dayAvailability = await Promise.all(
          careStaff.map(async (staff) => {
            const carerApplication = await CarerApplication.findOne({
              userId: staff.user,
            });
            const dayOfWeek = this.getDayOfWeek(date);
            const dayAvailability =
              carerApplication?.availability?.availabilityDetails?.[dayOfWeek];

            return {
              _id: staff._id,
              user: staff.user,
              role: staff.role,
              organization: staff.organization,
              availability: {
                isAvailable: !!dayAvailability?.available,
                periods: {
                  morning: !!dayAvailability?.morning,
                  afternoon: !!dayAvailability?.afternoon,
                  evening: !!dayAvailability?.evening,
                  night: !!dayAvailability?.night,
                },
              },
            };
          })
        );

        availabilityMap[date] = dayAvailability;
      }

      return availabilityMap;
    } catch (error) {
      throw error;
    }
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
