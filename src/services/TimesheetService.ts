import { Types } from "mongoose";
import TimesheetModel from "../models/Timesheet";
import ShiftService from "./ShiftService";
import Logger from "src/logger";
import ShiftTypeService from "./ShiftPatternService";
import { User } from "src/models/new/Heirarchy";
import ShiftAssignmentModel from "src/models/ShiftAssignment";
import CarerDocumentService from "./CarerService";
import { ITimesheet } from "src/interfaces/entities/timesheet";
import dayjs from "dayjs";
import { ShiftPattern } from "src/models/ShiftPattern";
import ApiError from "src/exceptions/ApiError";
import TimesheetWebSocketApp from "src/app/TsSocket";

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
interface CreateTimesheetParams {
  shiftId: string;
  userId: string;
  shiftPatternId: string;
  organizationId: string;
  homeId: string;
  documentUrl?: string;
}

class TimesheetService {
  private readonly shiftService: ShiftService;
  private readonly shiftPatternService: ShiftTypeService;
  private readonly carerDocumentService: CarerDocumentService;
  private timesheetWs: TimesheetWebSocketApp;

  private readonly defaultPopulateOptions = [
    {
      path: "shift_",
      select: "shiftPattern homeId date",
      populate: {
        path: "shiftPattern",
        select: "name timings userTypeRates rates",
      },
    },
    {
      path: "carer",
      select: "firstName lastName _id avatar.url role",
    },
    {
      path: "home",
      select: "name _id",
    },
    {
      path: "agency",
      select: "name _id",
    },
    {
      path: "approvedBy",
      select: "firstName lastName role",
    },
  ];

  private readonly carerPopulateOptions = [
    {
      path: "shift_",
      select: "shiftPattern homeId date",
      populate: {
        path: "shiftPattern",
        select: "name timings",
      },
    },
    {
      path: "carer",
      select: "firstName lastName _id avatar.url role",
    },
    {
      path: "home",
      select: "name _id",
    },
    {
      path: "agency",
      select: "name _id",
    },
    {
      path: "approvedBy",
      select: "firstName lastName role",
    },
  ];

  constructor() {
    this.shiftService = new ShiftService();
    this.shiftPatternService = new ShiftTypeService();
    this.carerDocumentService = new CarerDocumentService();
    this.timesheetWs = TimesheetWebSocketApp.getInstance();
  }

  public uploadManualTimesheet = async (
    userId: string,
    file: any
  ): Promise<string> => {
    try {
      const fileName = `${userId}/timesheets/${file.name}`;
      return await this.carerDocumentService.uploadManualTimesheet(
        file,
        fileName
      );
    } catch (error) {
      Logger.error("Error uploading manual timesheet:", error);
      throw new Error(`Failed to upload manual timesheet: ${error.message}`);
    }
  };

  public createTimesheet = async ({
    shiftId,
    userId,
    shiftPatternId,
    organizationId,
    homeId,
    documentUrl,
  }: CreateTimesheetParams): Promise<ITimesheet> => {
    try {
      const [user, shift] = await Promise.all([
        User.findById(userId).exec(),
        this.shiftService.getShiftById(shiftId),
      ]);

      if (!user) throw new Error("User not found");
      if (!shift) throw new Error("Shift not found");

      const timing = await this.shiftPatternService.getShiftPatternTimingByHome(
        homeId,
        shiftPatternId
      );

      const timesheet = await TimesheetModel.create({
        shift_: new Types.ObjectId(shiftId),
        carer: new Types.ObjectId(userId),
        agency: organizationId ? new Types.ObjectId(organizationId) : null,
        home: new Types.ObjectId(homeId),
        status: "pending",
        startTime: new Date(),
        documentUrl,
      });

      await ShiftAssignmentModel.findOneAndUpdate(
        {
          user: userId,
          shift: shiftId,
        },
        {
          status: "completed",
        }
      );

      return timesheet;
    } catch (error) {
      Logger.error("Error creating timesheet:", error);
      throw error;
    }
  };

  public getTimesheetsByRole = async (
    accountType: string,
    userId: string,
    orgType?: string,
    orgId?: string,
    pagination?: { page: number; limit: number },
    status?: "all" | "approved" | "pending" | "rejected",
    startDate?: Date,
    endDate?: Date
  ): Promise<PaginatedResponse<ITimesheet>> => {
    try {
      // Initialize base query object
      let query: Record<string, any> = {};

      // Add status filter if not 'all'
      if (status && status !== "all") {
        query.status = status;
      }

      if (startDate && endDate) {
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      // Add role-based filters
      switch (accountType) {
        case "admin":
          if (orgType === "agency") {
            query.agency = new Types.ObjectId(orgId);
          } else if (orgType === "home") {
            query.home = new Types.ObjectId(orgId);
          }
          break;

        case "care":
          query[orgType === "agency" ? "agency" : "home"] = new Types.ObjectId(
            orgId
          );
          query.carer = new Types.ObjectId(userId);
          break;

        default: // carer
          query.carer = new Types.ObjectId(userId);
      }

      // Set populate options based on account type
      const populateOptions =
        accountType === "care"
          ? this.carerPopulateOptions
          : this.defaultPopulateOptions;

      // Pagination setup
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [total, timesheets] = await Promise.all([
        TimesheetModel.countDocuments(query),
        TimesheetModel.find(query)
          .populate(populateOptions)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return {
        data: timesheets,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      Logger.error("Error getting timesheets by role:", error);
      throw error;
    }
  };

  public getTimesheetsByHomeId = async (
    homeId: string
  ): Promise<ITimesheet[]> => {
    try {
      return await TimesheetModel.find({ home: new Types.ObjectId(homeId) })
        .populate(this.defaultPopulateOptions)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      Logger.error("Error getting timesheets by home ID:", error);
      throw error;
    }
  };

  public approveTimesheet = async (
    timesheetId: string,
    rating?: number | null,
    review?: string | null
  ): Promise<ITimesheet | null> => {
    try {
      const updateData: any = {
        status: "approved",
        approvedAt: new Date(),
      };

      if (rating !== undefined && rating !== null) updateData.rating = rating;
      if (review !== undefined && review !== null) updateData.review = review;

      const timesheet = await TimesheetModel.findByIdAndUpdate(
        timesheetId,
        updateData,
        { new: true }
      ).exec();

      if (!timesheet) throw new Error("Timesheet not found");

      await Promise.all([
        ShiftAssignmentModel.findOneAndUpdate(
          {
            user: timesheet.carer,
            shift: timesheet.shift_,
          },
          {
            status: "signed",
          }
        ),
        this.shiftService.updateShiftStatus(
          timesheet.shift_.toString(),
          "done"
        ),
      ]);

      return timesheet;
    } catch (error) {
      Logger.error("Error approving timesheet:", error);
      throw error;
    }
  };

  public scanBarcode = async (
    signedBy: string,
    userId: string,
    qrCodeToken: string
  ): Promise<ITimesheet | null> => {
    Logger.info(
      `Scanning barcode - SignedBy: ${signedBy}, UserId: ${userId}, Token: ${qrCodeToken}`
    );

    try {
      const timesheet = await TimesheetModel.findOne({
        tokenForQrCode: qrCodeToken,
        carer: userId,
      }).exec();

      if (timesheet) {
        Logger.info(`Timesheet found - TimesheetId: ${timesheet._id}`);

        const shift = await this.shiftService.getShiftById(
          timesheet.shift_.toString()
        );
        Logger.info(`Shift retrieved - ShiftId: ${shift._id}`);

        const shiftPattern = await ShiftPattern.findById(
          shift.shiftPattern
        ).lean();
        Logger.info(`ShiftPattern retrieved - PatternId: ${shiftPattern._id}`);

        const shiftTiming = shiftPattern.timings.find(
          (timing) => timing.careHomeId.toString() === timesheet.home.toString()
        );
        Logger.info(
          `Shift timing found - StartTime: ${shiftTiming?.startTime}, EndTime: ${shiftTiming?.endTime}`
        );

        const shiftDate = dayjs(shift.date).format("YYYY-MM-DD");
        const shiftStartTime = dayjs(shiftTiming?.startTime).format("HH:mm");
        const shiftEndTime = dayjs(shiftTiming?.endTime).format("HH:mm");
        const currentTime = dayjs().format("YYYY-MM-DD HH:mm");

        // Validation checks
        if (shiftDate !== dayjs().format("YYYY-MM-DD")) {
          Logger.warn(
            `Invalid date - ShiftDate: ${shiftDate}, CurrentDate: ${dayjs().format(
              "YYYY-MM-DD"
            )}`
          );
          // this.timesheetWs.notifyTimesheetProcessed({
          //   barcode: qrCodeToken,
          //   carerId: userId,
          //   orgId: timesheet.home.toString(),
          //   timestamp: new Date(),
          //   timesheetId: timesheet._id.toString(),
          //   status: "error",
          //   error: "Invalid date for timesheet scan",
          // });
        }

        const shiftStartPlus30 = dayjs(shiftStartTime, "HH:mm")
          .add(30, "minute")
          .format("HH:mm");

        const shiftEndPlus30 = dayjs(shiftEndTime, "HH:mm")
          .add(30, "minute")
          .format("HH:mm");

        if (currentTime > shiftEndPlus30) {
          Logger.warn(
            `Shift expired - CurrentTime: ${currentTime}, ShiftEndPlus30: ${shiftEndPlus30}`
          );
          // this.timesheetWs.notifyTimesheetProcessed({
          //   barcode: qrCodeToken,
          //   carerId: userId,
          //   orgId: timesheet.home.toString(),
          //   timestamp: new Date(),
          //   timesheetId: timesheet._id.toString(),
          //   status: "error",
          //   error: "Shift has expired",
          // });
        }

        if (currentTime < shiftEndTime) {
          Logger.warn(
            `Shift not ended - CurrentTime: ${currentTime}, ShiftEndTime: ${shiftEndTime}`
          );
          // this.timesheetWs.notifyTimesheetProcessed({
          //   barcode: qrCodeToken,
          //   carerId: userId,
          //   orgId: timesheet.home.toString(),
          //   timestamp: new Date(),
          //   timesheetId: timesheet._id.toString(),
          //   status: "error",
          //   error: "Shift has not ended yet",
          // });
        }

        Logger.info("Updating timesheet and related records...");

        try {
          const [updateTimesheet] = await Promise.all([
            TimesheetModel.findByIdAndUpdate(
              timesheet._id,
              {
                status: "approved",
                approvedAt: new Date(),
                approvedBy: new Types.ObjectId(signedBy),
              },
              { new: true }
            ).exec(),
            ShiftAssignmentModel.findOneAndUpdate(
              {
                user: userId,
                shift: timesheet.shift_,
              },
              {
                status: "signed",
              }
            ).exec(),
            this.shiftService.updateShiftStatus(
              timesheet.shift_.toString(),
              "done"
            ),
          ]);

          Logger.info(
            `Timesheet updated successfully - TimesheetId: ${updateTimesheet._id}`
          );

          // Send success notification

          Logger.info("Sending success notification...");
          this.timesheetWs.notifyTimesheetProcessed({
            barcode: qrCodeToken,
            carerId: userId,
            orgId: timesheet.home.toString(),
            timestamp: new Date(),
            timesheetId: "1234",
            status: "success",
          });

          return {} as any;
        } catch (updateError) {
          Logger.error("Error updating timesheet records:", updateError);
          this.timesheetWs.notifyTimesheetProcessed({
            barcode: qrCodeToken,
            carerId: userId,
            orgId: timesheet.home.toString(),
            timestamp: new Date(),
            timesheetId: timesheet._id.toString(),
            status: "error",
            error: "Failed to update timesheet records",
          });
          throw updateError;
        }
      } else {
        Logger.error(
          `Timesheet not found - Token: ${qrCodeToken}, UserId: ${userId}`
        );
        this.timesheetWs.notifyTimesheetProcessed({
          barcode: qrCodeToken,
          carerId: userId,
          orgId: "", // No organization ID available
          timestamp: new Date(),
          timesheetId: "",
          status: "error",
          error: "Timesheet not found",
        });
        throw new Error("Timesheet not found");
      }
    } catch (error) {
      Logger.error("Error scanning barcode:", error);
      // Send final error notification if not already sent
      if (error.message !== "Timesheet not found") {
        this.timesheetWs.notifyTimesheetProcessed({
          barcode: qrCodeToken,
          carerId: userId,
          orgId: "", // Might not have organization ID in error case
          timestamp: new Date(),
          timesheetId: "",
          status: "error",
          error: error.message || "Unknown error occurred",
        });
      }
      throw error;
    }
  };

  public checkTimesheetStatus = async (
    carerId: string,
    qrcode: string
  ): Promise<ITimesheet | null> => {
    try {
      const timesheet = await TimesheetModel.findOne({
        carer: carerId,
        tokenForQrCode: qrcode,
      }).exec();

      if (!timesheet) {
        throw new ApiError("Timesheet not found", 404);
      }

      return timesheet;
    } catch (error) {
      Logger.error("Error checking timesheet status:", error);
      throw error;
    }
  };

  public rejectTimesheet = async (
    timesheetId: string,
    reason: string
  ): Promise<ITimesheet | null> => {
    try {
      const timesheet = await TimesheetModel.findByIdAndUpdate(
        timesheetId,
        {
          status: "rejected",
          rejectionReason: reason,
          rejectedAt: new Date(),
        },
        { new: true }
      ).exec();

      if (!timesheet) {
        throw new Error("Timesheet not found");
      }

      return timesheet;
    } catch (error) {
      Logger.error("Error rejecting timesheet:", error);
      throw error;
    }
  };

  public getTimesheetById = async (
    timesheetId: string
  ): Promise<ITimesheet | null> => {
    try {
      return await TimesheetModel.findById(timesheetId)
        .populate(this.defaultPopulateOptions)
        .lean();
    } catch (error) {
      Logger.error("Error getting timesheet by ID:", error);
      throw error;
    }
  };

  public updateTimesheet = async (
    timesheetId: string,
    updateData: Partial<ITimesheet>
  ): Promise<ITimesheet | null> => {
    try {
      const timesheet = await TimesheetModel.findByIdAndUpdate(
        timesheetId,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();

      if (!timesheet) {
        throw new Error("Timesheet not found");
      }

      return timesheet;
    } catch (error) {
      Logger.error("Error updating timesheet:", error);
      throw error;
    }
  };

  public getTimeSheetsByUserAndDate = async (
    userId: string,
    startDate: string,
    endDate: string,
    accountType: string
  ): Promise<ITimesheet[]> => {
    try {
      const baseQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        status: "approved",
      } as any;

      let query = { ...baseQuery };

      switch (accountType) {
        case "carer":
        case "nurse":
          query = { ...query, carer: new Types.ObjectId(userId) };
          break;
        case "agency":
          query = {
            ...query,
            agency: new Types.ObjectId(userId),
          };
          break;
        case "home":
          query = { ...query, home: new Types.ObjectId(userId) };
          break;
        default:
          throw new Error("Invalid account type");
      }

      return await TimesheetModel.find(query)
        .populate(this.defaultPopulateOptions)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      Logger.error("Error getting timesheets by user and date:", error);
      throw error;
    }
  };

  public getCarersTimesheets = async (orgId: string): Promise<ITimesheet[]> => {
    try {
      return await TimesheetModel.find({
        agency: new Types.ObjectId(orgId),
      })
        .populate(this.defaultPopulateOptions)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      Logger.error("Error getting carer timesheets:", error);
      throw error;
    }
  };

  public getAgencyTimesheets = async (
    agencyId: string,
    userId: string
  ): Promise<ITimesheet[]> => {
    try {
      return await TimesheetModel.find({
        agency: new Types.ObjectId(agencyId),
      })
        .populate(this.defaultPopulateOptions)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      Logger.error("Error getting agency timesheets:", error);
      throw error;
    }
  };

  public getHomeTimesheets = async (
    homeId: string,
    userId: string
  ): Promise<ITimesheet[]> => {
    try {
      return await TimesheetModel.find({
        home: new Types.ObjectId(homeId),
      })
        .populate(this.defaultPopulateOptions)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      Logger.error("Error getting home timesheets:", error);
      throw error;
    }
  };
}

export default TimesheetService;
