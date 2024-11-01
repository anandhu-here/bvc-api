import { Types } from "mongoose";
import Logger from "../logger";
import Shift from "../models/Shift";
import Invoice from "src/models/Invoice";
import TimesheetService from "./TimesheetService";
import type { ITimesheet } from "src/interfaces/entities/timesheet";
import moment from "moment";
import TimesheetModel from "src/models/Timesheet";
import CustomError from "src/helpers/ErrorHelper";
import StatusCodes from "src/constants/statusCodes";

interface CreateInvoiceParams {
  agencyId: string;
  homeId: string;
  startDate: string;
  endDate: string;
  timesheets: any[];
  totalAmount: number;
  shiftSummary: any;
}

interface InvoiceTimesheet {
  _id: string;
  hourlyRate: number;
  hours: number;
  amount: number;
  shiftDate: string;
  shiftType: string;
  carerName: string;
  homeName: string;
}

interface InvoiceCalculationResult {
  timesheets: InvoiceTimesheet[];
  totalAmount: number;
  totalTimesheets: number;
  firstShift: {
    date: string;
    type: string;
  };
  lastShift: {
    date: string;
    type: string;
  };
}

class InvoiceService {
  private timesheetService: TimesheetService;
  constructor() {
    this.timesheetService = new TimesheetService();
  }
  private async updateTimesheetsStatus(
    timesheetIds: string[],
    status: "pending_invoice" | "invoiced" | "paid",
    invoiceId: string
  ): Promise<void> {
    try {
      console.log("timesheetIds", timesheetIds);
      await TimesheetModel.updateMany(
        { _id: { $in: timesheetIds.map((id) => new Types.ObjectId(id)) } },
        {
          $set: {
            invoiceStatus: status,
            invoiceId: new Types.ObjectId(invoiceId),
          },
        }
      );

      Logger.info(
        `Updated ${timesheetIds.length} timesheets with status: ${status}`
      );
    } catch (error) {
      Logger.error("Error updating timesheet statuses:", error);
      throw new CustomError(
        "Failed to update timesheet statuses",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `INV-${year}${month}-${random}`;
  }

  public async createInvoice(params: CreateInvoiceParams): Promise<any> {
    console.log("params", params);

    try {
      const {
        agencyId,
        homeId,
        startDate,
        endDate,
        timesheets,
        totalAmount,
        shiftSummary,
      } = params;

      // Create invoice
      const invoice = new Invoice({
        invoiceNumber: this.generateInvoiceNumber(),
        agencyId: new Types.ObjectId(agencyId),
        homeId: new Types.ObjectId(homeId),
        startDate,
        endDate,
        totalAmount,
        shiftSummary,
        status: "pending",
        timesheetIds: timesheets.map((t) => t._id),
        createdAt: new Date(),
      });

      console.log("invoice", invoice);

      await invoice.save();

      console.log("timesheets", timesheets.length);

      // Update timesheet statuses
      await this.updateTimesheetsStatus(
        timesheets.map((t) => t._id),
        "pending_invoice",
        invoice._id.toString()
      );

      // Return populated invoice
      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate("agencyId", "name email phone address")
        .populate("homeId", "name email phone address")
        .lean();

      return populatedInvoice;
    } catch (error) {
      Logger.error("Error creating invoice:", error);
      throw error;
    }
  }

  // Method to update invoice status which also updates timesheet statuses
  public async updateInvoiceStatus(
    invoiceId: string,
    status: "pending" | "paid" | "cancelled"
  ): Promise<any> {
    const session = await Invoice.startSession();
    session.startTransaction();

    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new CustomError("Invoice not found", StatusCodes.NOT_FOUND);
      }

      invoice.status = status;
      await invoice.save({ session });

      // Update timesheet statuses based on invoice status
      const timesheetStatus = status === "paid" ? "paid" : "pending_invoice";
      await this.updateTimesheetsStatus(
        invoice.timesheetIds.map((id) => id.toString()),
        timesheetStatus,
        invoiceId
      );

      await session.commitTransaction();

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      Logger.error("Error updating invoice status:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  private calculateShiftSummary(timesheets): any {
    const summary: { [key: string]: any } = {};
    const invoiceTimesheets = [];
    let totalAmount = 0;

    for (const timesheet of timesheets) {
      try {
        // Find the correct rate based on the care home
        const homeRate = timesheet?.shiftId?.shiftPattern?.rates?.find(
          (rate) => rate.careHomeId === timesheet.homeId._id.toString()
        );

        // Determine if it's a weekend
        const isWeekend = moment(timesheet?.shiftId?.date).isoWeekday() > 5;

        // Calculate hourly rate
        const hourlyPay = isWeekend
          ? homeRate.weekendRate
          : homeRate.weekdayRate;

        // Find the correct timing based on the care home
        const timing = timesheet?.shiftId?.shiftPattern?.timings.find(
          (timing) => timing.careHomeId === timesheet.homeId._id.toString()
        );

        // Calculate shift duration using actual start and end times
        const startTime = moment(timing.startTime, "HH:mm");
        const endTime = moment(timing.endTime, "HH:mm");

        // Handle cases where the shift goes past midnight
        let shiftDuration;
        if (endTime.isBefore(startTime)) {
          shiftDuration = moment.duration(
            endTime.add(1, "day").diff(startTime)
          );
        } else {
          shiftDuration = moment.duration(endTime.diff(startTime));
        }

        const hours = shiftDuration.asHours();
        const amount = hourlyPay * hours;
        totalAmount += amount;

        invoiceTimesheets.push({
          ...timesheet,
          hourlyRate: hourlyPay,
          hours: hours,
          amount: amount,
        });
      } catch (error: any) {
        console.error("Error processing timesheet for invoice:", error);
      }
    }

    for (const timesheet of invoiceTimesheets) {
      console.log(timesheet, "poor");
      const shiftType = timesheet?.shiftId?.shiftPattern?.name;
      const isWeekend = moment(timesheet?.shiftId?.date).isoWeekday() > 5;

      if (!summary[shiftType]) {
        summary[shiftType] = {
          shiftType,
          count: 0,
          totalHours: 0,
          weekdayHours: 0,
          weekendHours: 0,
          weekdayRate: 0,
          weekendRate: 0,
          totalAmount: 0,
        };
      }

      summary[shiftType].count += 1;
      summary[shiftType].totalHours += timesheet.hours;
      summary[shiftType].totalAmount += timesheet.amount;

      if (isWeekend) {
        summary[shiftType].weekendHours += timesheet.hours;
        summary[shiftType].weekendRate = timesheet.hourlyRate;
      } else {
        summary[shiftType].weekdayHours += timesheet.hours;
        summary[shiftType].weekdayRate = timesheet.hourlyRate;
      }
    }
    console.log("summary", summary);

    return {
      shiftSummary: summary,
      totalAmount,
    };
  }

  private async getTimesheetsForInvoice(
    agencyId: string,
    homeId: string,
    startDate: string,
    endDate: string
  ): Promise<ITimesheet[]> {
    try {
      // Use aggregation to properly filter by shift date
      const timesheets = await TimesheetModel.aggregate([
        {
          $lookup: {
            from: "shifts",
            localField: "shift_",
            foreignField: "_id",
            as: "shift",
          },
        },
        {
          $unwind: "$shift",
        },
        {
          $match: {
            "shift.date": {
              $gte: startDate,
              $lte: endDate,
            },
            agency: new Types.ObjectId(agencyId),
            home: new Types.ObjectId(homeId),
            status: "approved", // Only include approved timesheets
            invoiceStatus: { $ne: "pending" }, // Exclude already invoiced timesheets
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
          $unwind: "$shiftPattern",
        },
        {
          $lookup: {
            from: "organizations",
            localField: "home",
            foreignField: "_id",
            as: "homeDetails",
          },
        },
        {
          $unwind: "$homeDetails",
        },
      ]);

      return timesheets;
    } catch (error) {
      Logger.error("Error getting timesheets for invoice:", error);
      throw new CustomError(
        "Failed to get timesheets for invoice",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public getInvoices = async (userId: string): Promise<any> => {
    try {
      const objectId = new Types.ObjectId(userId);

      return await Invoice.find({
        $or: [{ agencyId: objectId }, { homeId: objectId }],
      })
        .populate("agencyId", "fname lname email company")
        .populate("homeId", "fname lname email company")
        .populate({
          path: "timesheets",
          select: "status invoiceStatus",
        })
        .sort({ createdAt: -1 });
    } catch (error: any) {
      Logger.error("InvoiceService: getInvoices:", error);
      throw error;
    }
  };

  public getInvoiceById = async (invoiceId: string): Promise<any> => {
    try {
      return await Invoice.findById(invoiceId);
    } catch (error: any) {
      Logger.error(
        "InvoiceService: getInvoiceById",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };

  public async calculateInvoiceSummary(
    agencyId: string,
    homeId: string,
    startDate: string,
    endDate: string
  ): Promise<InvoiceCalculationResult> {
    try {
      Logger.info("Calculating invoice summary", {
        agencyId,
        homeId,
        startDate,
        endDate,
      });

      // Get approved timesheets for the period
      const timesheets = await TimesheetModel.aggregate([
        {
          $lookup: {
            from: "shifts",
            localField: "shift_",
            foreignField: "_id",
            as: "shift",
          },
        },
        { $unwind: "$shift" },
        {
          $match: {
            "shift.date": {
              $gte: startDate,
              $lte: endDate,
            },
            agency: new Types.ObjectId(agencyId),
            home: new Types.ObjectId(homeId),
            status: "approved",
            invoiceStatus: { $ne: "pending" },
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
        { $unwind: "$shiftPattern" },
        {
          $lookup: {
            from: "users",
            localField: "carer",
            foreignField: "_id",
            as: "carerDetails",
          },
        },
        { $unwind: "$carerDetails" },
        {
          $lookup: {
            from: "organizations",
            localField: "home",
            foreignField: "_id",
            as: "homeDetails",
          },
        },
        { $unwind: "$homeDetails" },
        {
          $sort: { "shift.date": 1 },
        },
      ]);

      let totalAmount = 0;
      const processedTimesheets: InvoiceTimesheet[] = [];

      for (const timesheet of timesheets) {
        try {
          // Find the correct rate based on the care home
          const homeRate = timesheet.shiftPattern.rates.find(
            (rate: any) => rate.careHomeId === timesheet.home._id.toString()
          );

          if (!homeRate) {
            Logger.warn("No rate found for timesheet:", {
              timesheetId: timesheet._id,
              homeId: timesheet.home._id,
            });
            continue;
          }

          // Determine if it's a weekend
          const isWeekend = moment(timesheet.shift.date).isoWeekday() > 5;

          // Calculate hourly rate
          const hourlyPay = isWeekend
            ? homeRate.weekendRate
            : homeRate.weekdayRate;

          // Find the correct timing based on the care home
          const timing = timesheet.shiftPattern.timings.find(
            (t: any) => t.careHomeId === timesheet.home._id.toString()
          );

          if (!timing) {
            Logger.warn("No timing found for timesheet:", {
              timesheetId: timesheet._id,
              homeId: timesheet.home._id,
            });
            continue;
          }

          // Calculate shift duration
          const startTime = moment(timing.startTime, "HH:mm");
          const endTime = moment(timing.endTime, "HH:mm");

          let shiftDuration;
          if (endTime.isBefore(startTime)) {
            shiftDuration = moment.duration(
              endTime.add(1, "day").diff(startTime)
            );
          } else {
            shiftDuration = moment.duration(endTime.diff(startTime));
          }

          const hours = shiftDuration.asHours();
          const amount = hourlyPay * hours;
          totalAmount += amount;

          processedTimesheets.push({
            _id: timesheet._id,
            hourlyRate: hourlyPay,
            hours,
            amount,
            shiftDate: timesheet.shift.date,
            shiftType: timesheet.shiftPattern.name,
            carerName: `${timesheet.carerDetails.firstName} ${timesheet.carerDetails.lastName}`,
            homeName: timesheet.homeDetails.name,
          });
        } catch (error) {
          Logger.error("Error processing timesheet for invoice calculation:", {
            error,
            timesheetId: timesheet._id,
          });
        }
      }

      return {
        timesheets: processedTimesheets,
        totalAmount,
        totalTimesheets: processedTimesheets.length,
        firstShift: {
          date: processedTimesheets[0]?.shiftDate,
          type: processedTimesheets[0]?.shiftType,
        },
        lastShift: {
          date: processedTimesheets[processedTimesheets.length - 1]?.shiftDate,
          type: processedTimesheets[processedTimesheets.length - 1]?.shiftType,
        },
      };
    } catch (error) {
      Logger.error("Error calculating invoice summary:", error);
      throw error;
    }
  }
}

export default InvoiceService;
