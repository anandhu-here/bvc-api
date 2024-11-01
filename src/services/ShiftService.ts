import mongoose, { Types, Document } from "mongoose";
import ShiftModel from "src/models/Shift";
import TimesheetModel from "src/models/Timesheet";
import StatusCodes from "src/constants/statusCodes";
import CustomError from "src/helpers/ErrorHelper";
import NodeRSA from "node-rsa";
import QRCode from "qrcode";
import Logger from "src/logger";
import PushNotification from "./PushNotificationService";
import UserService from "./UserService";
import type { IShiftPattern } from "src/interfaces/entities/shift-pattern";
import UserRelationship from "src/models/UserRelationShip";
import ShiftAssignmentModel from "src/models/ShiftAssignment";
import dayjs from "dayjs";
import moment from "moment";
import { OrganizationRole } from "src/models/new/Heirarchy";
import { FCMToken } from "src/models/new/FCM";
import {
  INotificationHistory,
  NotificationHistory,
} from "src/models/Notifications";
import HistoricNotificationService from "./HistoricNotifications";
import { title } from "process";
import TimesheetService from "./TimesheetService";
import { ShiftPattern } from "src/models/ShiftPattern";
interface CurrentShiftResponse {
  shift: IShift | null;
  isCurrentlyWorking: boolean;
  currentTime: string;
  shiftTiming?: {
    startTime: string;
    endTime: string;
  };
}

// Interfaces
interface IRate {
  careHomeId: string;
  weekdayRate: number;
  weekendRate: number;
}

interface ITimesheet extends Document {
  // Add timesheet properties here
}

interface IShift extends Document {
  _id: Types.ObjectId;
  agentId?: Types.ObjectId | string;
  homeId: Types.ObjectId;
  isAccepted: boolean;
  isRejected: boolean;
  isDone: boolean;
  date: string;
  isCompleted: boolean;
  count: number;
  assignedUsers: Types.ObjectId[];
  privateKey?: string;
  signedCarers?: {
    [carerId: string]: string;
  };
  timesheet?: ITimesheet;
  shiftPattern: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
class ShiftService {
  private readonly _pushSvc = new PushNotification();
  private readonly _userSvc = new UserService();
  private notificationQueue: Map<string, Set<string>> = new Map();
  private tempShiftMap: Map<string, any> = new Map(); // To store temporary shift data
  private notificationTimeout: any = null;
  private notificationSvc: HistoricNotificationService;

  constructor() {
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

  // notification scheduler
  private addToNotificationQueue(
    userId: string,
    shiftData: any,
    isAgency: boolean,
    senderName: string
  ): void {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, new Set());
    }
    this.notificationQueue
      .get(userId)!
      .add(JSON.stringify({ ...shiftData, isAgency, senderName }));
  }

  private scheduleDelayedNotification(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.processNotificationQueue();
    }, 1000); // 1 minute
  }

  private async processNotificationQueue(): Promise<void> {
    for (const [userId, shiftDataSet] of this.notificationQueue.entries()) {
      if (shiftDataSet.size > 0) {
        const shiftDataArray = Array.from(shiftDataSet).map((data) =>
          JSON.parse(data)
        );
        await this.sendNotificationToUser(userId, shiftDataArray);
      }
    }
    this.notificationQueue.clear();
  }

  private async sendNotificationToUser(
    userId: string,
    shiftsData: any[]
  ): Promise<void> {
    try {
      const fcmTokens = await FCMToken.find({ user: userId });

      if (fcmTokens.length === 0) {
        Logger.info(`No FCM tokens found for user: ${userId}`);
        return;
      }

      const isAgency = shiftsData[0].isAgency;
      const totalShiftCount = shiftsData.reduce(
        (total, shift) => total + (parseInt(shift.count) || 0),
        0
      );

      const message = {
        notification: {
          title: isAgency ? "New Shifts Published" : "New Shifts Assigned",
          body: isAgency
            ? `${shiftsData[0].senderName} has published ${totalShiftCount} new shift`
            : `You have been assigned to ${totalShiftCount} new shift${
                totalShiftCount > 1 ? "s" : ""
              }.`,
        },
        data: {
          type: isAgency ? "NEW_SHIFTS_PUBLISHED" : "NEW_SHIFTS_ASSIGNED",
          senderName: shiftsData[0].senderName,
          shiftsData: JSON.stringify(
            shiftsData.map((shift) => ({
              date: shift.date,
              homeId: shift.homeId.toString(),
              shiftPatternId: shift.shiftPattern.toString(),
              count: shift.count.toString(),
            }))
          ),
          totalShiftCount: totalShiftCount.toString(),
        },
      };

      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.token);

      await this._pushSvc.sendToMultipleDevices(tokens, message);
      const metadata = {
        type: isAgency ? "NEW_SHIFTS_PUBLISHED" : "NEW_SHIFTS_ASSIGNED",
        senderName: shiftsData[0].senderName,
        shiftsData: shiftsData.map((shift) => ({
          date: shift.date,
          homeId: shift.homeId.toString(),
          shiftPatternId: shift.shiftPattern.toString(),
          count: shift.count.toString(),
        })),
        totalShiftCount: totalShiftCount.toString(),
      };

      await this.saveNotificationHistory(
        shiftsData[0].homeId,
        metadata.type,
        "medium",
        message.notification.title,
        message.notification.body,
        metadata,
        { users: [userId] },
        shiftsData[0].senderName
      );

      Logger.info(
        `Notification sent to ${
          isAgency ? "agency" : "user"
        } ${userId} for ${totalShiftCount} shifts`
      );
    } catch (error) {
      Logger.error(`Error sending notification to user ${userId}:`, error);
    }
  }

  public getCarerCurrentShift = async (
    userId: string
  ): Promise<CurrentShiftResponse> => {
    try {
      const now = dayjs();
      const currentDate = now.format("YYYY-MM-DD");
      const currentTime = now.format("HH:mm");

      // Find active shift assignment for today
      const shiftAssignment = await ShiftAssignmentModel.findOne({
        user: new Types.ObjectId(userId),
        status: { $in: ["confirmed", "signed", "assigned"] }, // Only consider confirmed or signed shifts
      })
        .populate({
          path: "shift",
          populate: [
            {
              path: "shiftPattern",
              model: ShiftPattern,
            },
            {
              path: "homeId",
              select: "_id name",
            },
          ],
        })
        .lean();

      // If no assignment found or the populated shift is null (didn't match our criteria)
      if (!shiftAssignment || !shiftAssignment.shift) {
        return {
          shift: null,
          isCurrentlyWorking: false,
          currentTime,
        };
      }

      const shift = shiftAssignment.shift as any;
      const shiftPattern = shift.shiftPattern as any; // Using any due to populated field

      if (!shiftPattern) {
        return {
          shift: null,
          isCurrentlyWorking: false,
          currentTime,
        };
      }

      // Get the shift pattern timings for this care home
      const timing = shiftPattern.timings.find(
        (t: { careHomeId: string }) =>
          t.careHomeId.toString() === shift.homeId._id.toString()
      );

      if (!timing) {
        return {
          shift: null,
          isCurrentlyWorking: false,
          currentTime,
        };
      }

      const shiftStartTime = timing.startTime;
      const shiftEndTime = timing.endTime;

      const startHr = parseInt(shiftStartTime.split(":")[0]);
      const endHr = parseInt(shiftEndTime.split(":")[0]);

      // Check if current time falls within shift hours
      const shiftStart = dayjs(
        `${currentDate} ${timing.startTime}`,
        "YYYY-MM-DD HH:mm"
      );

      let shiftEnd = dayjs(
        `${currentDate} ${timing.endTime}`,
        "YYYY-MM-DD HH:mm"
      );

      console.log(shiftStart.format("YYYY-MM-DD hh:mm"), "andi");

      // if (startHr > 12 && endHr < 12) {
      //   shiftEnd = dayjs(
      //     `${currentDate} ${timing.endTime}`,
      //     "YYYY-MM-DD HH:mm"
      //   ).add(1, "day");
      // }

      console.log(shiftEnd.format("YYYY-MM-DD hh:mm"), "andi");

      // Handle overnight shifts
      let isCurrentlyWorking = false;
      // if (timing.endTime < timing.startTime) {
      //   // Shift goes past midnight
      //   const nextDay = dayjs(currentDate).add(1, "day").format("YYYY-MM-DD");
      //   const adjustedShiftEnd = dayjs(
      //     `${nextDay} ${timing.endTime}`,
      //     "YYYY-MM-DD HH:mm"
      //   );
      //   isCurrentlyWorking =
      //     now.isAfter(shiftStart) && now.isBefore(adjustedShiftEnd);
      // } else {
      //   // Normal shift within same day

      // }
      isCurrentlyWorking = now.isAfter(shiftStart) && now.isBefore(shiftEnd);

      return {
        shift,
        isCurrentlyWorking,
        currentTime,
        shiftTiming: {
          startTime: timing.startTime,
          endTime: timing.endTime,
        },
      };
    } catch (error: any) {
      Logger.error("Error getting carer current shift:", error);
      return {
        shift: null,
        isCurrentlyWorking: false,
        currentTime: dayjs().format("HH:mm"),
      };
    }
  };

  // bar code generator
  public async generateBarcode(
    shiftId: string,
    userId: string,
    agency?: string,
    home?: string,
    shiftPattern?: string
  ): Promise<string> {
    const shift = await ShiftModel.findOne({
      _id: shiftId,
      shiftPattern: shiftPattern,
    }).lean();
    if (!shift) {
      throw new CustomError("Shift not found", StatusCodes.NOT_FOUND);
    }

    const today = dayjs().format("YYYY-MM-DD");
    const shiftDate = dayjs(shift.date).format("YYYY-MM-DD");

    if (today !== shiftDate) {
      // throw new CustomError(
      //   "Barcode can only be generated on the day of the shift",
      //   StatusCodes.BAD_REQUEST
      // );

      console.log("Barcode can only be generated on the day of the shift");
    }

    const shiftAssignment = await ShiftAssignmentModel.findOne({
      shift: shiftId,
      user: userId,
    }).lean();

    if (!shiftAssignment) {
      throw new CustomError(
        "Shift assignment not found",
        StatusCodes.NOT_FOUND
      );
    }

    const randomKey = Math.random().toString(36).substring(7);

    const timesheet = await TimesheetModel.findOneAndUpdate(
      {
        shift_: new Types.ObjectId(shiftId),
        carer: new Types.ObjectId(userId),
        home: new Types.ObjectId(home),
      },
      {
        $set: {
          agency: agency ? new Types.ObjectId(agency) : null,
          status: "pending",
          tokenForQrCode: randomKey,
        },
      },
      {
        new: true, // returns the updated document
        upsert: true, // creates a new document if one doesn't exist
        setDefaultsOnInsert: true, // applies schema defaults if creating new document
      }
    );

    return randomKey;
  }
  // notification scheduler ends

  public async getUnacceptedShiftsForAgency(
    agencyId: string
  ): Promise<IShift[]> {
    try {
      return await ShiftModel.find({
        agentId: agencyId,
        agencyAccepted: false,
        isRejected: false,
      })
        .populate("homeId", "_id name")
        .populate("shiftPattern")
        .lean();
    } catch (error) {
      Logger.error("Error getting unaccepted shifts for agency:", error);
      throw new CustomError(
        "Failed to get unaccepted shifts",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async acceptShiftByAgency(
    shiftId: string,
    agencyId: string
  ): Promise<IShift> {
    try {
      const shift = await ShiftModel.findOneAndUpdate(
        {
          _id: shiftId,
          agentId: agencyId,
          isAccepted: false,
        },
        {
          isAccepted: true,
        },
        { new: true }
      )
        .populate("homeId", "_id name")
        .populate("shiftPattern");

      if (!shift) {
        throw new CustomError(
          "Shift not found or already accepted",
          StatusCodes.NOT_FOUND
        );
      }

      return shift;
    } catch (error) {
      Logger.error("Error accepting shift by agency:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to accept shift",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getCarerQuickStats(
    userId: string,
    month: number,
    year: number
  ): Promise<any> {
    const carerId = new Types.ObjectId(userId);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const stats = await ShiftAssignmentModel.aggregate([
      {
        $match: {
          user: carerId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "shifts",
          localField: "shift",
          foreignField: "_id",
          as: "shiftDetails",
        },
      },
      {
        $unwind: "$shiftDetails",
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          completedShifts: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          signedShifts: {
            $sum: {
              $cond: [{ $eq: ["$status", "signed"] }, 1, 0],
            },
          },
          previousMonthSignedShifts: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "signed"] },
                    { $lt: [{ $toDate: "$shiftDetails.date" }, startDate] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalAssigned: 0,
        completedShifts: 0,
        signedShifts: 0,
        previousMonthSignedShifts: 0,
      };
    }

    return {
      totalAssigned: stats[0].totalAssigned,
      completedShifts: stats[0].completedShifts,
      signedShifts: stats[0].signedShifts,
      previousMonthSignedShifts: stats[0].previousMonthSignedShifts,
    };
  }

  public async getAgencyQuickStats(
    userId: string,
    month: number,
    year: number
  ): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const stats = await ShiftModel.aggregate([
      {
        $match: {
          agentId: new Types.ObjectId(userId),
          date: {
            $gte: startDate.toISOString().split("T")[0],
            $lte: endDate.toISOString().split("T")[0],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalShifts: { $sum: 1 },
          completedShifts: { $sum: { $cond: ["$isCompleted", 1, 0] } },
          acceptedShifts: { $sum: { $cond: ["$isAccepted", 1, 0] } },
          rejectedShifts: { $sum: { $cond: ["$isRejected", 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalShifts: 0,
        completedShifts: 0,
        acceptedShifts: 0,
        rejectedShifts: 0,
        completionRate: 0,
        acceptanceRate: 0,
      };
    }

    const { totalShifts, completedShifts, acceptedShifts, rejectedShifts } =
      stats[0];

    return {
      totalShifts,
      completedShifts,
      acceptedShifts,
      rejectedShifts,
      completionRate:
        totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0,
      acceptanceRate:
        totalShifts > 0 ? (acceptedShifts / totalShifts) * 100 : 0,
    };
  }

  public async getHomeQuickStats(
    userId: string,
    month: number,
    year: number
  ): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const shifts = await ShiftModel.find({
      homeId: new Types.ObjectId(userId),
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    });

    const totalShifts = shifts.length;
    const completedShifts = shifts.filter((shift) => shift.isCompleted).length;
    const acceptedShifts = shifts.filter((shift) => shift.isAccepted).length;
    const rejectedShifts = shifts.filter((shift) => shift.isRejected).length;

    return {
      totalShifts,
      completedShifts,
      acceptedShifts,
      rejectedShifts,
      completionRate:
        totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0,
      acceptanceRate:
        totalShifts > 0 ? (acceptedShifts / totalShifts) * 100 : 0,
    };
  }

  public async getYourShifts(
    userId: string | Types.ObjectId
  ): Promise<IShift[]> {
    return ShiftModel.find({ agentId: userId })
      .populate("homeId", "_id company")
      .populate("assignedUsers", "_id fname lname")
      .populate("agentId", "_id company")
      .populate("shiftPattern")
      .lean();
  }

  public async getPublishedShifts(
    userId: string | Types.ObjectId
  ): Promise<IShift[]> {
    return ShiftModel.find({ homeId: userId })
      .populate("homeId", "_id company")
      .populate("assignedUsers", "_id fname lname")
      .populate("agentId", "_id company")
      .populate("shiftPattern")
      .lean();
  }

  public async getAssignedShifts(
    userId: string | Types.ObjectId
  ): Promise<any[]> {
    try {
      const shifts = await ShiftModel.find({
        assignedUsers: new Types.ObjectId(userId),
      })
        .populate("homeId", "_id company")
        .populate("assignedUsers", "_id fname lname")
        .populate("agentId", "_id company")
        .populate("shiftPattern")
        .lean();

      const shiftIds = shifts.map((shift) => shift._id);
      const timesheets = await TimesheetModel.find({
        shift_: { $in: shiftIds },
        carerId: userId,
      }).lean();

      const timesheetMap = new Map(
        timesheets.map((timesheet) => [timesheet.shift_.toString(), timesheet])
      );

      return shifts.map((shift) => ({
        ...shift,
        timesheet: timesheetMap.get(shift._id.toString()) || null,
      }));
    } catch (error) {
      Logger.error("Error getting shifts by assigned user:", error);
      throw new Error("Failed to get shifts by assigned user");
    }
  }

  public getunAcceptedShifts = async (userId: string): Promise<IShift[]> => {
    const shifts = await ShiftModel.find({
      homeId: userId,
      isAccepted: false,
    });
    return shifts;
  };

  public getShiftById = async (
    shiftId: string | Types.ObjectId
  ): Promise<IShift | null> => {
    try {
      const shift = await ShiftModel.findById(shiftId)
        .populate({
          path: "assignedUsers",
          select: "_id fname lname",
        })
        .populate("shiftPattern")
        .exec();
      return shift;
    } catch (error: any) {
      Logger.error("Error retrieving shift:", error);
      return null;
    }
  };
  async getUpcomingUnassignedShifts(
    date: string,
    userId: string
  ): Promise<IShift[]> {
    console.log("Date:", date, userId);
    const startDate = moment(date, "DD-MM-YYYY").startOf("day");
    const endDate = moment(startDate).add(7, "days").endOf("day");

    // Find all shifts for the next week
    const shifts = await ShiftModel.find({
      date: {
        $gte: startDate.format("YYYY-MM-DD"),
        $lte: endDate.format("YYYY-MM-DD"),
      },
    }).populate("shiftPattern");

    // Find all assignments for this user in the next week
    const assignments = await ShiftAssignmentModel.find({
      user: new Types.ObjectId(userId),
      shift: { $in: shifts.map((shift) => shift._id) },
    });

    // Create a set of assigned shift IDs for quick lookup
    const assignedShiftIds = new Set(
      assignments.map((a) => a.shift.toString())
    );

    // Filter out shifts that the user is already assigned to
    const unassignedShifts = shifts.filter(
      (shift) => !assignedShiftIds.has(shift._id.toString())
    );

    return unassignedShifts;
  }

  public getPubShifts = async (
    orgId: string | Types.ObjectId,
    month?: number
  ): Promise<IShift[]> => {
    let matchStage: any = { homeId: new Types.ObjectId(orgId) };

    // If month is provided, filter shifts for that month
    if (typeof month === "number") {
      const year = new Date().getFullYear(); // Current year
      const monthStr = month.toString().padStart(2, "0"); // Ensure two-digit month

      matchStage.date = {
        $regex: `^${year}-${monthStr}-`,
      };
    }

    const shifts = await ShiftModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: ShiftAssignmentModel.collection.name,
          localField: "_id",
          foreignField: "shift",
          as: "shiftAssignments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedUsers",
          foreignField: "_id",
          as: "assignedUsers",
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "homeId",
          foreignField: "_id",
          as: "home",
        },
      },
      {
        $lookup: {
          from: "shiftpatterns",
          localField: "shiftPattern",
          foreignField: "_id",
          as: "shiftPatternData",
        },
      },
      { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$home", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$shiftPatternData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          date: 1,
          isAccepted: 1,
          isRejected: 1,
          isDone: 1,
          isCompleted: 1,
          count: 1,
          privateKey: 1,
          signedCarers: 1,
          agencyAccepted: 1,
          createdAt: 1,
          updatedAt: 1,
          assignedUsers: {
            $map: {
              input: "$assignedUsers",
              as: "user",
              in: {
                _id: "$$user._id",
                fname: "$$user.fname",
                lname: "$$user.lname",
              },
            },
          },
          agentId: { _id: "$agent._id", name: "$agent.name" },
          homeId: { _id: "$home._id", name: "$home.name" },
          shiftPattern: "$shiftPatternData",
          shiftAssignments: 1,
        },
      },
    ]);

    return shifts;
  };

  public getAgencyShifts = async (
    agencyId: string | Types.ObjectId,
    month?: number
  ): Promise<any[]> => {
    let matchStage: any = { agentId: new Types.ObjectId(agencyId) };

    // If month is provided, filter shifts for that month
    if (typeof month === "number") {
      const year = new Date().getFullYear(); // Current year
      const monthStr = month.toString().padStart(2, "0"); // Ensure two-digit month

      matchStage.date = {
        $regex: `^${year}-${monthStr}-`,
      };
    }

    const shifts = await ShiftModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: ShiftAssignmentModel.collection.name,
          localField: "_id",
          foreignField: "shift",
          as: "shiftAssignments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedUsers",
          foreignField: "_id",
          as: "assignedUsers",
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "homeId",
          foreignField: "_id",
          as: "home",
        },
      },
      {
        $lookup: {
          from: "shiftpatterns",
          localField: "shiftPattern",
          foreignField: "_id",
          as: "shiftPatternData",
        },
      },
      { $unwind: { path: "$home", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$shiftPatternData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          date: 1,
          isAccepted: 1,
          isRejected: 1,
          isDone: 1,
          isCompleted: 1,
          count: 1,
          privateKey: 1,
          signedCarers: 1,
          agencyAccepted: 1,
          createdAt: 1,
          updatedAt: 1,
          assignedUsers: {
            $map: {
              input: "$assignedUsers",
              as: "user",
              in: {
                _id: "$$user._id",
                fname: "$$user.fname",
                lname: "$$user.lname",
              },
            },
          },
          agentId: { _id: "$agentId", name: { $literal: "Agency Name" } }, // You might want to add a $lookup for this if needed
          homeId: { _id: "$home._id", name: "$home.name" },
          shiftPattern: "$shiftPatternData",
          shiftAssignments: 1,
        },
      },
    ]);

    return shifts;
  };

  public createShift = async (
    shiftData: Partial<IShift>,
    shiftPattern: IShiftPattern
  ): Promise<IShift> => {
    Logger.info("Shift data:", shiftData);
    const newShift = await ShiftModel.create({
      ...shiftData,
      shiftPattern: shiftPattern._id,
    });
    return newShift;
  };
  public async createAndAssignMultipleShifts(
    shiftsData: Partial<
      IShift & {
        assignedStaff: string[];
        count?: number;
      }
    >[],
    homeId: string,
    homeName: string
  ): Promise<IShift[]> {
    const objectId = new Types.ObjectId(homeId);
    const shiftBulkOps: any[] = [];
    const assignmentBulkOps: any[] = [];
    const notificationPromises: Promise<void>[] = [];
    const newShifts: any[] = [];

    // Fetch existing shifts in one query
    const existingShifts = await ShiftModel.find({
      homeId: objectId,
      date: { $in: shiftsData.map((shift) => shift.date) },
      shiftPattern: { $in: shiftsData.map((shift) => shift.shiftPattern) },
    }).lean();

    const existingShiftMap = new Map(
      existingShifts.map((shift) => [
        `${shift.date}-${shift.shiftPattern}`,
        shift,
      ])
    );

    for (const shiftData of shiftsData) {
      const objectifiedAssignedUsers = (shiftData.assignedStaff || []).map(
        (userId) => new Types.ObjectId(userId.toString())
      );

      const shiftKey = `${shiftData.date}-${shiftData.shiftPattern}`;
      const existingShift = existingShiftMap.get(shiftKey);

      if (existingShift) {
        const totalCount =
          (parseInt(existingShift.count.toString()) || 0) +
          (parseInt(shiftData.count?.toString() || "1") || 1);

        shiftBulkOps.push({
          updateOne: {
            filter: { _id: existingShift._id },
            update: {
              $set: {
                count: totalCount,
                isAccepted: objectifiedAssignedUsers.length > 0,
                isCompleted: objectifiedAssignedUsers.length === totalCount,
                isDone: false,
              },
              $addToSet: {
                assignedUsers: { $each: objectifiedAssignedUsers },
              },
            },
          },
        });

        // Create shift assignments for existing shift
        objectifiedAssignedUsers.forEach((userId) => {
          assignmentBulkOps.push({
            insertOne: {
              document: {
                shift: existingShift._id,
                user: userId,
                status: "assigned",
              },
            },
          });
        });
      } else {
        const newShift = {
          ...shiftData,
          homeId: objectId,
          isAccepted: objectifiedAssignedUsers.length > 0,
          isCompleted:
            objectifiedAssignedUsers.length === (shiftData.count || 1),
          agentId:
            shiftData.agentId === "internal" || !shiftData.agentId
              ? undefined
              : new Types.ObjectId(shiftData.agentId.toString()),
          assignedUsers: objectifiedAssignedUsers,
          count: shiftData.count || 1,
        };

        newShifts.push(newShift);

        // Schedule notifications asynchronously
        notificationPromises.push(
          this.scheduleNotifications(
            newShift,
            objectifiedAssignedUsers,
            homeName
          )
        );
      }
    }

    // Insert new shifts
    if (newShifts.length > 0) {
      const insertedShifts = await ShiftModel.insertMany(newShifts);

      // Create shift assignments for new shifts
      insertedShifts.forEach((shift, index) => {
        const objectifiedAssignedUsers = newShifts[index].assignedUsers;
        objectifiedAssignedUsers.forEach((userId: Types.ObjectId) => {
          assignmentBulkOps.push({
            insertOne: {
              document: {
                shift: shift._id,
                user: userId,
                status: "assigned",
              },
            },
          });
        });
      });
    }

    // Execute bulk operations
    if (shiftBulkOps.length > 0) {
      await ShiftModel.bulkWrite(shiftBulkOps);
    }

    if (assignmentBulkOps.length > 0) {
      await ShiftAssignmentModel.bulkWrite(assignmentBulkOps);
    }

    // Process notifications asynchronously
    Promise.all(notificationPromises).catch((error) =>
      Logger.error("Error processing notifications:", error)
    );

    // Fetch and return populated shifts
    const populatedShifts = await ShiftModel.find({
      homeId: objectId,
      date: { $in: shiftsData.map((shift) => shift.date) },
      shiftPattern: { $in: shiftsData.map((shift) => shift.shiftPattern) },
    })
      .populate("homeId")
      .populate("agentId")
      .populate("assignedUsers", "_id fname lname")
      .populate("shiftPattern");

    return populatedShifts;
  }

  public async createMultipleShifts(
    shiftsData: Partial<IShift>[],
    homeId: string,
    homeName: string
  ): Promise<IShift[]> {
    const objectId = new Types.ObjectId(homeId);
    const bulkOps: any[] = [];
    const notificationPromises: Promise<void>[] = [];

    // Fetch existing shifts in one query
    const existingShifts = await ShiftModel.find({
      homeId: objectId,
      date: { $in: shiftsData.map((shift) => shift.date) },
      shiftPattern: { $in: shiftsData.map((shift) => shift.shiftPattern) },
    }).lean();

    const existingShiftMap = new Map(
      existingShifts.map((shift) => [
        `${shift.date}-${shift.shiftPattern}`,
        shift,
      ])
    );

    for (const shiftData of shiftsData) {
      const objectifiedAssignedUsers = (shiftData.assignedUsers || []).map(
        (userId) => new Types.ObjectId(userId.toString())
      );

      const shiftKey = `${shiftData.date}-${shiftData.shiftPattern}`;
      const existingShift = existingShiftMap.get(shiftKey);

      if (existingShift) {
        const totalCount =
          (parseInt(existingShift.count.toString()) || 0) +
          (parseInt(shiftData.count?.toString() || "1") || 1);

        bulkOps.push({
          updateOne: {
            filter: { _id: existingShift._id },
            update: {
              $set: {
                count: totalCount,
                isAccepted: existingShift.assignedUsers.length > 0,
                isCompleted: existingShift.assignedUsers.length === totalCount,
                isDone: false,
              },
              $addToSet: {
                assignedUsers: { $each: objectifiedAssignedUsers },
              },
            },
          },
        });
      } else {
        const newShift = {
          ...shiftData,
          homeId: objectId,
          isAccepted: objectifiedAssignedUsers.length > 0,
          isCompleted:
            objectifiedAssignedUsers.length === (shiftData.count || 1),
          agentId:
            shiftData.agentId === "internal" || !shiftData.agentId
              ? undefined
              : new Types.ObjectId(shiftData.agentId.toString()),
          assignedUsers: objectifiedAssignedUsers,
          count: shiftData.count || 1,
        };

        bulkOps.push({
          insertOne: {
            document: newShift,
          },
        });

        // Schedule notifications asynchronously
        notificationPromises.push(
          this.scheduleNotifications(
            newShift,
            objectifiedAssignedUsers,
            homeName
          )
        );
      }
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      await ShiftModel.bulkWrite(bulkOps);
    }

    // Process notifications asynchronously
    Promise.all(notificationPromises).catch((error) =>
      Logger.error("Error processing notifications:", error)
    );

    // Fetch and return populated shifts
    const populatedShifts = await ShiftModel.find({
      homeId: objectId,
      date: { $in: shiftsData.map((shift) => shift.date) },
      shiftPattern: { $in: shiftsData.map((shift) => shift.shiftPattern) },
    })
      .populate("homeId")
      .populate("agentId")
      .populate("assignedUsers", "_id fname lname")
      .populate("shiftPattern");

    return populatedShifts;
  }

  private async scheduleNotifications(
    newShift: any,
    assignedUsers: Types.ObjectId[],
    homeName: string
  ): Promise<void> {
    // Add assigned users to notification queue
    assignedUsers.forEach((userId) => {
      this.addToNotificationQueue(
        userId.toString(),
        newShift,
        newShift.agentId !== undefined,
        homeName
      );
    });

    if (newShift.agentId) {
      const orgRoles = await OrganizationRole.find({
        organization: newShift.agentId,
        role: "admin",
      }).lean();

      orgRoles?.forEach((role) => {
        this.addToNotificationQueue(
          role.user.toString(),
          newShift,
          true,
          homeName
        );
      });
    }

    this.scheduleDelayedNotification();
  }

  private toObjectId(id: string | undefined): Types.ObjectId | null {
    if (!id) return null;
    try {
      return new Types.ObjectId(id);
    } catch (error: any) {
      Logger.error(`Invalid ObjectId: ${id}`);
      return null;
    }
  }

  public replaceCarerInShift = async (
    shiftId: string,
    oldCarerId: string,
    newCarerId: string
  ): Promise<IShift | null> => {
    try {
      const shift = await ShiftModel.findById(shiftId).exec();

      if (!shift) {
        throw new Error("Shift not found");
      }

      const assignedUsers = shift.assignedUsers.map((userId) =>
        userId.toString()
      );
      const oldCarerIndex = assignedUsers.indexOf(oldCarerId);

      if (oldCarerIndex === -1) {
        throw new Error("Old carer is not assigned to this shift");
      }

      const newCarerIndex = assignedUsers.indexOf(newCarerId);

      if (newCarerIndex !== -1) {
        throw new Error("New carer is already assigned to this shift");
      }

      assignedUsers[oldCarerIndex] = newCarerId;

      shift.assignedUsers = assignedUsers.map(
        (userId) => new Types.ObjectId(userId)
      );

      await shift.save();

      const updatedShift = await ShiftModel.findById(shiftId)
        .populate({
          path: "homeId",
          select: "_id company",
        })
        .populate({
          path: "assignedUsers",
          select: "_id fname lname",
        })
        .populate({
          path: "agentId",
          select: "_id company",
        });

      return updatedShift;
    } catch (error: any) {
      Logger.error("Error replacing carer in shift:", error);
      throw new Error("Failed to replace carer in shift");
    }
  };

  public deleteShift = async (shiftId: string): Promise<boolean> => {
    try {
      // Step 1: Find the shift first
      const shift = await ShiftModel.findById(shiftId).exec();
      if (!shift) {
        Logger.warn(`Attempt to delete non-existent shift with ID: ${shiftId}`);
        return false; // Shift not found, consider it as already deleted
      }

      // Step 2: Delete associated shift assignments
      const assignmentDeleteResult = await ShiftAssignmentModel.deleteMany({
        shift: shiftId,
      }).exec();
      Logger.info(
        `Deleted ${assignmentDeleteResult.deletedCount} shift assignments for shift ${shiftId}`
      );

      // Step 3: Delete the shift
      const shiftDeleteResult = await ShiftModel.findByIdAndDelete(
        shiftId
      ).exec();

      if (shiftDeleteResult) {
        Logger.info(`Successfully deleted shift with ID: ${shiftId}`);
        return true;
      } else {
        // This situation should be rare, as we checked for existence earlier
        Logger.error(
          `Failed to delete shift with ID: ${shiftId} after deleting its assignments`
        );
        return false;
      }
    } catch (error: any) {
      Logger.error(
        `Error during shift deletion process for shift ${shiftId}:`,
        error
      );
      return false;
    }
  };

  public updateShift = async (
    shiftId: string,
    updatedShiftData: Partial<IShift>,
    shiftPattern: IShiftPattern
  ): Promise<IShift | null> => {
    const updatedShift = await ShiftModel.findByIdAndUpdate(
      shiftId,
      {
        ...updatedShiftData,
        shiftPattern: shiftPattern._id,
      },
      { new: true }
    ).exec();

    const shift = await ShiftModel.findById(shiftId)
      .populate({
        path: "homeId",
        select: "_id name",
      })
      .populate({
        path: "assignedUsers",
        select: "_id fname lname",
      })
      .populate({
        path: "agentId",
        select: "_id name",
      })
      .populate("shiftPattern")
      .lean();

    return shift;
  };

  public acceptShift = async (shiftId: string): Promise<IShift | null> => {
    const updatedShift = await ShiftModel.findByIdAndUpdate(
      shiftId,
      {
        isAccepted: true,
        isRejected: false,
      },
      { new: true }
    ).exec();
    return updatedShift;
  };

  public rejectShift = async (shiftId: string): Promise<IShift | null> => {
    const updatedShift = await ShiftModel.findByIdAndUpdate(
      shiftId,
      {
        isRejected: true,
        agentId: undefined,
        isAccepted: false,
      },
      { new: true }
    ).exec();
    return updatedShift;
  };

  public getSingleShift = async (
    shiftId: string | Types.ObjectId
  ): Promise<any | null> => {
    const matchStage = { _id: new Types.ObjectId(shiftId) };

    const shifts = await ShiftModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: ShiftAssignmentModel.collection.name,
          localField: "_id",
          foreignField: "shift",
          as: "shiftAssignments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedUsers",
          foreignField: "_id",
          as: "assignedUsers",
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "homeId",
          foreignField: "_id",
          as: "home",
        },
      },
      {
        $lookup: {
          from: "shiftpatterns",
          localField: "shiftPattern",
          foreignField: "_id",
          as: "shiftPatternData",
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "agentId",
          foreignField: "_id",
          as: "agency",
        },
      },
      { $unwind: { path: "$home", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$shiftPatternData",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $unwind: { path: "$agency", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          date: 1,
          isAccepted: 1,
          isRejected: 1,
          isDone: 1,
          isCompleted: 1,
          count: 1,
          privateKey: 1,
          signedCarers: 1,
          agencyAccepted: 1,
          createdAt: 1,
          updatedAt: 1,
          assignedUsers: {
            $map: {
              input: "$assignedUsers",
              as: "user",
              in: {
                _id: "$$user._id",
                fname: "$$user.fname",
                lname: "$$user.lname",
              },
            },
          },
          agentId: {
            _id: "$agency._id",
            name: "$agency.name",
          },
          homeId: { _id: "$home._id", name: "$home.name" },
          shiftPattern: "$shiftPatternData",
          shiftAssignments: 1,
        },
      },
    ]);

    // Since we're querying for a single shift by ID, we expect at most one result
    return shifts.length > 0 ? shifts[0] : null;
  };

  public async getAssignmentsByShiftId(shiftId: string): Promise<any[]> {
    try {
      const assignments = await ShiftAssignmentModel.find({ shift: shiftId })
        .populate("user")
        .lean();
      return assignments;
    } catch (error: any) {
      Logger.error("Error getting assignments for shift:", error);
      throw new CustomError(
        "Failed to get assignments",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async assignUsersToShifts(
    assignments: { shiftId: string; userIds: string[] }[]
  ): Promise<any[]> {
    const results = [];

    for (const { shiftId, userIds } of assignments) {
      try {
        const shift = await ShiftModel.findById(shiftId)
          .populate({
            path: "assignedUsers",
            select: "_id fname lname",
          })
          .populate({
            path: "agentId",
            select: "_id name",
          })
          .populate({
            path: "homeId",
            select: "_id name",
          })
          .populate("shiftPattern");
        if (!shift) {
          results.push({ shiftId, error: "Shift not found" });
          continue;
        }

        const existingAssignments = await ShiftAssignmentModel.countDocuments({
          shift: shiftId,
        });
        if (existingAssignments + userIds.length > shift.count) {
          results.push({
            shiftId,
            error: "Number of assignments exceeds shift count",
          });
          continue;
        }

        const newAssignments = userIds.map((userId) => ({
          shift: new Types.ObjectId(shiftId),
          user: new Types.ObjectId(userId),
          status: "assigned",
        }));

        const createdAssignments = await ShiftAssignmentModel.insertMany(
          newAssignments
        );

        // Update shift status if fully assigned
        if (existingAssignments + createdAssignments.length === shift.count) {
          shift.isCompleted = true;
          await shift.save();
        } else {
          shift.isAccepted = true;
          shift.isCompleted = false;
          await shift.save();
        }

        // Notify assigned users
        await this.notifyAssignedUsers(userIds);
        const shiftAgain = await ShiftModel.findById(shiftId)
          .populate({
            path: "assignedUsers",
            select: "_id fname lname",
          })
          .populate({
            path: "agentId",
            select: "_id name",
          })
          .populate({
            path: "homeId",
            select: "_id name",
          })
          .populate("shiftPattern");

        results.push(shiftAgain);
      } catch (error: any) {
        Logger.error(`Error assigning users to shift ${shiftId}:`, error);
        results.push({ shiftId, error: error.message });
      }
    }

    return results;
  }

  public async swapAssignedUsers(
    shiftId: string,
    oldUserId: string,
    newUserId: string
  ): Promise<any> {
    try {
      const shift = await ShiftModel.findById(shiftId);

      if (!shift) {
        throw new CustomError("Shift not found", StatusCodes.NOT_FOUND);
      }

      const oldAssignment = await ShiftAssignmentModel.findOne({
        shift: shiftId,
        user: oldUserId,
      });

      if (!oldAssignment) {
        throw new CustomError(
          "Old user not assigned to this shift",
          StatusCodes.BAD_REQUEST
        );
      }

      const newAssignment = await ShiftAssignmentModel.findOne({
        shift: shiftId,
        user: newUserId,
      });

      if (newAssignment) {
        throw new CustomError(
          "New user already assigned to this shift",
          StatusCodes.BAD_REQUEST
        );
      }

      oldAssignment.user = new Types.ObjectId(newUserId);
      await oldAssignment.save();

      // Update shift status if all assignments are confirmed or completed
      newAssignment.user = new Types.ObjectId(oldUserId);
      await newAssignment.save();

      return shift;
    } catch (error) {
      Logger.error("Error swapping assigned users:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to swap assigned users",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async unassignUserFromShift(
    shiftId: string,
    userId: string
  ): Promise<IShift> {
    try {
      const shift = await ShiftModel.findById(shiftId);
      if (!shift) {
        throw new CustomError("Shift not found", StatusCodes.NOT_FOUND);
      }

      const assignment = await ShiftAssignmentModel.findOne({
        shift: shiftId,
        user: userId,
      });

      if (!assignment) {
        throw new CustomError(
          "User not assigned to this shift",
          StatusCodes.BAD_REQUEST
        );
      }

      if (assignment.status === "signed") {
        const timesheet = await TimesheetModel.findOne({
          shift_: shiftId,
          carer: userId,
        });

        if (timesheet) {
          throw new CustomError(
            "User is already signed. You must delete the timesheet to unassign.",
            StatusCodes.BAD_REQUEST
          );
        }
      }

      // If we reach here, we can delete the assignment
      await ShiftAssignmentModel.deleteOne({
        shift: shiftId,
        user: userId,
      });

      // Update shift status
      shift.isCompleted = false;
      shift.isDone = false;

      await shift.save();

      const updatedShift = await ShiftModel.findById(shiftId)
        .populate("assignedUsers", "_id fname lname")
        .populate("agentId", "_id name")
        .populate("homeId", "_id name")
        .populate("shiftPattern")
        .lean()
        .exec();

      if (!updatedShift) {
        throw new CustomError(
          "Failed to retrieve updated shift",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      this.notifyUnassignedUsers([userId]);

      return updatedShift;
    } catch (error: any) {
      Logger.error("Error unassigning user from shift:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to unassign user",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async updateAssignmentStatus(
    assignmentId: string,
    status: string
  ): Promise<any> {
    try {
      const validStatuses = ["assigned", "confirmed", "declined", "completed"];
      if (!validStatuses.includes(status)) {
        throw new CustomError("Invalid status", StatusCodes.BAD_REQUEST);
      }

      const updatedAssignment = await ShiftAssignmentModel.findByIdAndUpdate(
        assignmentId,
        { status },
        { new: true }
      ).populate("user", "_id firstName lastName");

      if (!updatedAssignment) {
        throw new CustomError("Assignment not found", StatusCodes.NOT_FOUND);
      }

      // Update shift status if all assignments are confirmed or completed
      if (status === "confirmed" || status === "completed") {
        await this.updateShiftStatusIfNeeded(updatedAssignment.shift);
      }

      return updatedAssignment;
    } catch (error: any) {
      Logger.error("Error updating assignment status:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to update assignment status",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getAssignmentsForUser(userId: string): Promise<any[]> {
    try {
      Logger.info(`Getting assignments for user: ${userId}`);

      // Step 1: Get assignments with populated shift data
      const assignments = await ShiftAssignmentModel.find({
        user: userId,
        shift: { $exists: true, $ne: null },
      })
        .populate({
          path: "shift",
          populate: [
            { path: "homeId", select: "_id name" },
            { path: "agentId", select: "_id name" },
            { path: "shiftPattern" },
          ],
        })
        .lean()
        .exec();

      if (!assignments || assignments.length === 0) {
        Logger.info(`No assignments found for user: ${userId}`);
        return [];
      }

      // Step 2: Safely extract shift IDs, filtering out any null or undefined values
      const shiftIds = assignments
        .filter((assignment) => assignment?.shift && assignment.shift._id)
        .map((assignment) => assignment.shift._id);

      if (shiftIds.length === 0) {
        Logger.warn(
          `No valid shift IDs found in assignments for user: ${userId}`
        );
        return assignments.map((assignment) => ({
          ...assignment,
          timesheet: null,
        }));
      }

      try {
        // Step 3: Fetch timesheets for valid shift IDs
        const timesheets = await TimesheetModel.find({
          shift_: { $in: shiftIds },
          carer: userId,
        }).lean();

        // Step 4: Combine assignments with timesheets, with proper null checks
        const assignmentsWithTimesheets = assignments.map((assignment) => {
          const shiftId = assignment?.shift?._id?.toString();
          return {
            ...assignment,
            timesheet: timesheets.find(
              (timesheet) => timesheet.shift_?.toString() === shiftId
            ),
          };
        });

        return assignmentsWithTimesheets;
      } catch (timesheetError) {
        // If timesheet fetch fails, return assignments without timesheets
        Logger.error("Error fetching timesheets:", timesheetError);
        return assignments.map((assignment) => ({
          ...assignment,
          timesheet: null,
        }));
      }
    } catch (error: any) {
      Logger.error("Error getting assignments for user:", error);
      throw new CustomError(
        "Failed to get assignments",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
  public async getAssignmentsForAShift(shiftId: string): Promise<any[]> {
    try {
      const assignments = await ShiftAssignmentModel.find({ shiftId })
        .populate("userId", "_id firstName lastName")
        .exec();
      return assignments;
    } catch (error: any) {
      Logger.error("Error getting assignments for a shift:", error);
      throw new CustomError(
        "Failed to get assignments",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getAssignmentById(assignmentId: string): Promise<any> {
    try {
      const assignment = await ShiftAssignmentModel.findById(assignmentId)
        .populate("userId", "_id firstName lastName")
        .populate({
          path: "shiftId",
          populate: [
            { path: "homeId", select: "_id name" },
            { path: "agentId", select: "_id name" },
            { path: "shiftPattern" },
          ],
        })
        .exec();
      if (!assignment) {
        throw new CustomError("Assignment not found", StatusCodes.NOT_FOUND);
      }
      return assignment;
    } catch (error: any) {
      Logger.error("Error getting assignment by id:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to get assignment",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async notifyAssignedUsers(userIds: string[]): Promise<void> {
    const notificationPayload: any = {
      notification: {
        title: "New Shift Assignment",
        body: "You have been assigned to a new shift",
      },
      data: {
        type: "NEW_SHIFT_ASSIGNMENT",
        // You can add more data fields here if needed
      },
      android: {
        notification: {
          clickAction: "OPEN_SHIFT_DETAILS",
          icon: "ic_shift_notification",
        },
      },
      apns: {
        payload: {
          aps: {
            category: "NEW_SHIFT_CATEGORY",
          },
        },
      },
    };

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await this._userSvc.findUserByIdExc(userId);
          if (user?.fcmTokens?.length > 0) {
            const tokens = user.fcmTokens.map((token) => token.token);
            await this._pushSvc.sendToMultipleDevices(
              tokens,
              notificationPayload
            );
            console.log(`Notification sent successfully to user ${userId}`);
          } else {
            console.log(`No FCM tokens found for user ${userId}`);
          }
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          // Consider implementing a retry mechanism or alternative notification method
        }
      })
    );
  }

  private async notifyUnassignedUsers(userIds: string[]): Promise<void> {
    const notificationPayload: any = {
      notification: {
        title: "Shift Cancelled",
        body: "You have been unassigned from a shift",
      },
      data: {
        type: "SHIFT_CANCELLED",
        // You can add more data fields here if needed
      },

      android: {
        notification: {
          clickAction: "OPEN_SHIFT_DETAILS",
          icon: "ic_shift_notification",
        },
      },
      apns: {
        payload: {
          aps: {
            category: "SHIFT_CANCELLED_CATEGORY",
          },
        },
      },
    };

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await this._userSvc.findUserByIdExc(userId);
          if (user?.fcmTokens?.length > 0) {
            const tokens = user.fcmTokens.map((token) => token.token);
            await this._pushSvc.sendToMultipleDevices(
              tokens,
              notificationPayload
            );
            console.log(`Notification sent successfully to user ${userId}`);
          } else {
            console.log(`No FCM tokens found for user ${userId}`);
          }
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          // Consider implementing a retry mechanism or alternative notification method
        }
      })
    );
  }

  private async updateShiftStatusIfNeeded(
    shiftId: Types.ObjectId
  ): Promise<void> {
    const [allAssignments, shift] = await Promise.all([
      ShiftAssignmentModel.find({ shift: shiftId }),
      ShiftModel.findById(shiftId),
    ]);

    if (!shift) return;

    const allConfirmedOrCompleted = allAssignments.every(
      (assignment) =>
        assignment.status === "confirmed" || assignment.status === "completed"
    );

    if (allConfirmedOrCompleted && !shift.isAccepted) {
      shift.isAccepted = true;
      await shift.save();
    }
  }

  public async generateQRCode(
    shiftId: string
  ): Promise<{ publicKey: string; qrCodeData: string }> {
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }

    const key = new NodeRSA({ b: 512 });
    const privateKey = key.exportKey("pkcs1-private-pem");
    const publicKey = key.exportKey("pkcs1-public-pem");

    shift.privateKey = privateKey;
    await shift.save();

    const qrCodeData = await QRCode.toDataURL(publicKey);

    return { publicKey, qrCodeData };
  }

  public async verifyPublicKey(
    shiftId: string,
    publicKey: string,
    carerId: string
  ): Promise<boolean> {
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }

    const key = new NodeRSA(shift.privateKey);
    const isValid = key.verify(carerId, publicKey, "utf8", "pkcs1-public-pem");

    if (isValid) {
      shift.signedCarers = shift.signedCarers || {};
      shift.signedCarers[carerId] = publicKey;
      await shift.save();
    }

    return isValid;
  }

  // Additional helper methods

  private validateShiftData(shiftData: Partial<IShift>): void {
    if (!shiftData.homeId) {
      throw new Error("Home ID is required");
    }
    if (!shiftData.date) {
      throw new Error("Shift date is required");
    }
    if (shiftData.count === undefined || shiftData.count < 1) {
      throw new Error("Invalid shift count");
    }
    // Add more validations as needed
  }

  public async getShiftsByDateRange(
    startDate: Date,
    endDate: Date,
    homeId?: string
  ): Promise<IShift[]> {
    const query: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    if (homeId) {
      query.homeId = homeId;
    }
    return ShiftModel.find(query)
      .populate("homeId")
      .populate("agentId")
      .populate("assignedUsers")
      .populate("shiftPattern")
      .exec();
  }

  public async getShiftStats(
    homeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const shifts = await this.getShiftsByDateRange(startDate, endDate, homeId);
    const totalShifts = shifts.length;
    const completedShifts = shifts.filter((shift) => shift.isCompleted).length;
    const acceptedShifts = shifts.filter((shift) => shift.isAccepted).length;
    const rejectedShifts = shifts.filter((shift) => shift.isRejected).length;

    return {
      totalShifts,
      completedShifts,
      acceptedShifts,
      rejectedShifts,
      completionRate:
        totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0,
      acceptanceRate:
        totalShifts > 0 ? (acceptedShifts / totalShifts) * 100 : 0,
    };
  }

  public async getOverlappingShifts(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<IShift[]> {
    return ShiftModel.find({
      assignedUsers: userId,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
    }).exec();
  }

  public async checkShiftAvailability(
    shiftId: string
  ): Promise<{ available: boolean; reason?: string }> {
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
      return { available: false, reason: "Shift not found" };
    }
    if (shift.isCompleted) {
      return { available: false, reason: "Shift is already completed" };
    }
    if (shift.assignedUsers.length >= shift.count) {
      return { available: false, reason: "Shift is fully assigned" };
    }
    return { available: true };
  }

  public async updateShiftStatus(
    shiftId: string,
    status: "completed" | "cancelled" | "in-progress" | "done"
  ): Promise<IShift | null> {
    const statusUpdate: Partial<IShift> = {};
    switch (status) {
      case "completed":
        statusUpdate.isCompleted = true;
        break;
      case "cancelled":
        statusUpdate.isRejected = true;
        statusUpdate.isAccepted = false;
        break;
      case "in-progress":
        statusUpdate.isAccepted = true;
        statusUpdate.isRejected = false;
        statusUpdate.isCompleted = false;
        break;
      case "done":
        statusUpdate.isDone = true;
        statusUpdate.isCompleted = true;
        break;
    }
    return ShiftModel.findByIdAndUpdate(shiftId, statusUpdate, {
      new: true,
    }).exec();
  }
}

export default ShiftService;
