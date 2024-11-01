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
import Logger from "src/logger";
import ShiftAssignmentModel from "src/models/ShiftAssignment";

const dayMapping = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
} as const;

// Interfaces

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
interface IShiftTiming {
  startTime: string;
  endTime: string;
  careHomeId: string;
}

interface IAvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  existingShift?: {
    _id: string;
    pattern: string;
    time: string;
  };
  conflicts?: {
    type: "assignment" | "preference" | "schedule";
    details: string;
  };
}

interface IStaffAvailability {
  _id: Types.ObjectId;
  user: {
    _id: Types.ObjectId;
    fname: string;
    lname: string;
  };
  role: string;
  organization: Types.ObjectId;
  availability: IAvailabilityCheck;
  metadata?: {
    lastAssignment?: Date;
    totalAssignments?: number;
    preferredShiftTypes?: string[];
  };
}

interface IExistingAssignment {
  hasAssignment: boolean;
  existingShift?: {
    _id: string;
    pattern: string;
    time: string;
  };
  conflicts?: Array<{
    shiftId: string;
    type: string;
    time: string;
  }>;
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

  private getDayOfWeek(date: string): keyof typeof dayMapping {
    const day = dayjs(date).format("dddd").toLowerCase();
    return day as keyof typeof dayMapping;
  }

  private async validateShiftPattern(
    shiftPatternId: string,
    careHomeId: string
  ): Promise<{ pattern: any; timing: IShiftTiming }> {
    const shiftPattern = await ShiftPattern.findById(shiftPatternId);

    if (!shiftPattern) {
      Logger.error(`Shift pattern not found: ${shiftPatternId}`);
      throw new CustomError("Shift pattern not found", StatusCodes.NOT_FOUND);
    }

    const timing = shiftPattern.timings.find(
      (t) => t.careHomeId === careHomeId
    );

    if (!timing) {
      Logger.error(
        `No timing found for care home ${careHomeId} in pattern ${shiftPatternId}`
      );
      throw new CustomError(
        "No timing found for this care home",
        StatusCodes.NOT_FOUND
      );
    }

    return { pattern: shiftPattern, timing };
  }

  private async validateOrganization(organizationId: string): Promise<void> {
    const organizationExists = await OrganizationRole.exists({
      organization: new Types.ObjectId(organizationId),
    });

    if (!organizationExists) {
      Logger.error(`Organization not found: ${organizationId}`);
      throw new CustomError("Organization not found", StatusCodes.NOT_FOUND);
    }
  }
  private async checkExistingAssignments(
    userId: string,
    date: string
  ): Promise<IExistingAssignment> {
    try {
      Logger.info(
        `Checking existing assignments for user ${userId} on ${date}`
      );

      // Find all assignments and check their shift dates
      const existingAssignments = await ShiftAssignmentModel.aggregate([
        {
          $lookup: {
            from: "shifts",
            localField: "shift",
            foreignField: "_id",
            as: "shift",
          },
        },
        {
          $unwind: "$shift",
        },
        {
          $match: {
            user: new Types.ObjectId(userId),
            "shift.date": date, // Match the exact shift date
          },
        },
        {
          $lookup: {
            from: "shiftpatterns",
            localField: "shift.shiftPattern",
            foreignField: "_id",
            as: "shiftPattern",
          },
        },
        {
          $unwind: {
            path: "$shiftPattern",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            shift: {
              _id: "$shift._id",
              date: "$shift.date",
            },
            shiftPattern: {
              _id: "$shiftPattern._id",
              name: "$shiftPattern.name",
              timings: "$shiftPattern.timings",
            },
          },
        },
      ]);

      if (existingAssignments.length === 0) {
        return { hasAssignment: false };
      }

      // Get details of all conflicts
      const conflicts = existingAssignments.map((assignment) => ({
        shiftId: assignment.shift._id.toString(),
        type: assignment.shiftPattern.name,
        time: assignment.shiftPattern.timings[0]?.startTime || "N/A", // Assuming first timing is relevant
      }));

      const primaryAssignment = existingAssignments[0];

      return {
        hasAssignment: true,
        existingShift: {
          _id: primaryAssignment.shift._id.toString(),
          pattern: primaryAssignment.shiftPattern.name,
          time: primaryAssignment.shiftPattern.timings[0]?.startTime || "N/A",
        },
        conflicts,
      };
    } catch (error) {
      Logger.error(
        `Error checking existing assignments for user ${userId}:`,
        error
      );
      throw new CustomError(
        "Error checking existing assignments",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async checkCarerAvailability(
    carerId: string,
    shiftDate: string,
    startTime: string,
    endTime: string
  ): Promise<IAvailabilityCheck> {
    try {
      Logger.info(`Checking availability for carer ${carerId} on ${shiftDate}`);

      // Check existing assignments first
      const assignmentCheck = await this.checkExistingAssignments(
        carerId,
        shiftDate
      );

      if (assignmentCheck.hasAssignment) {
        return {
          isAvailable: false,
          reason: `Already assigned to ${assignmentCheck.existingShift?.pattern} at ${assignmentCheck.existingShift?.time}`,
          existingShift: assignmentCheck.existingShift,
          conflicts: {
            type: "assignment",
            details: `Has ${assignmentCheck.conflicts?.length} assignment(s) on this day`,
          },
        };
      }

      // Check availability preferences
      const carerApplication = await CarerApplication.findOne({
        userId: carerId,
      });

      if (!carerApplication?.availability?.availabilityDetails) {
        return {
          isAvailable: false,
          reason: "No availability preferences set",
          conflicts: {
            type: "preference",
            details: "Availability preferences not configured",
          },
        };
      }

      const dayOfWeek = dayjs(shiftDate).format("dddd").toLowerCase();
      const shiftPeriod = this.getShiftPeriod(startTime, endTime);
      const dayAvailability =
        carerApplication.availability.availabilityDetails[dayOfWeek];

      if (!dayAvailability?.available) {
        return {
          isAvailable: false,
          reason: `Not available on ${dayjs(shiftDate).format("dddd")}s`,
          conflicts: {
            type: "preference",
            details: `Has marked ${dayjs(shiftDate).format(
              "dddd"
            )} as unavailable`,
          },
        };
      }

      if (!dayAvailability[shiftPeriod]) {
        return {
          isAvailable: false,
          reason: `Not available during ${shiftPeriod} shifts`,
          conflicts: {
            type: "schedule",
            details: `Does not work ${shiftPeriod} shifts`,
          },
        };
      }

      // Additional checks could be added here (e.g., maximum hours per week)

      return {
        isAvailable: true,
      };
    } catch (error) {
      Logger.error(`Error checking availability for carer ${carerId}:`, error);
      throw new CustomError(
        "Error checking staff availability",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getCarerMetadata(
    carerId: string,
    shiftDate: string
  ): Promise<IStaffAvailability["metadata"]> {
    try {
      const [lastAssignment, totalAssignments] = await Promise.all([
        ShiftAssignmentModel.findOne({ user: carerId })
          .sort({ createdAt: -1 })
          .select("createdAt"),
        ShiftAssignmentModel.countDocuments({ user: carerId }),
      ]);

      const carerApplication = await CarerApplication.findOne({
        userId: carerId,
      }).select("availability.preferredShiftTypes");

      return {
        lastAssignment: lastAssignment?.createdAt,
        totalAssignments,
      };
    } catch (error) {
      Logger.warn(`Error fetching carer metadata for ${carerId}:`, error);
      return {};
    }
  }

  public async getAvailableStaffForShift(
    organizationId: string,
    shiftPatternId: string,
    shiftDate: string,
    careHomeId: string
  ): Promise<{
    data: IStaffAvailability[];
    meta: { total: number; availableCount: number };
  }> {
    try {
      Logger.info("Getting available staff for shift", {
        organizationId,
        shiftPatternId,
        shiftDate,
        careHomeId,
      });

      // Validate all required params
      await this.validateOrganization(organizationId);
      const { pattern, timing } = await this.validateShiftPattern(
        shiftPatternId,
        careHomeId
      );

      // Get all care staff
      const careStaff = await OrganizationRole.find({
        organization: new Types.ObjectId(organizationId),
        role: { $in: ["carer", "nurse"] },
      }).populate("user", "firstName lastName");

      // Check availability for each staff member
      const staffAvailabilityPromises = careStaff.map(async (staff) => {
        const [availability, metadata] = await Promise.all([
          this.checkCarerAvailability(
            staff.user._id.toString(),
            shiftDate,
            timing.startTime,
            timing.endTime
          ),
          this.getCarerMetadata(staff.user._id.toString(), shiftDate),
        ]);

        return {
          _id: staff._id,
          user: staff.user,
          role: staff.role,
          organization: staff.organization,
          availability,
          metadata,
        };
      });

      const staffWithAvailability = await Promise.all(
        staffAvailabilityPromises
      );

      // Filter based on user type rates if specified

      const availableCount = staffWithAvailability.filter(
        (staff) => staff.availability.isAvailable
      ).length;

      Logger.info("Successfully retrieved available staff", {
        total: staffWithAvailability.length,
        available: availableCount,
      });

      return {
        data: staffWithAvailability as any,
        meta: {
          total: staffWithAvailability.length,
          availableCount,
        },
      };
    } catch (error) {
      Logger.error("Error getting available staff:", error);
      throw error instanceof CustomError
        ? error
        : new CustomError(
            "Error getting available staff",
            StatusCodes.INTERNAL_SERVER_ERROR
          );
    }
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
