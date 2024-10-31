import { Types } from "mongoose";
import Logger from "../logger";
import Shift from "../models/Shift";
import Invoice from "src/models/Invoice";
import TimesheetService from "./TimesheetService";
import type { ITimesheet } from "src/interfaces/entities/timesheet";
import moment from "moment";

class InvoiceService {
  private timesheetService: TimesheetService;
  constructor() {
    this.timesheetService = new TimesheetService();
  }
  public createInvoice = async (
    agencyId: string,
    homeId: string,
    startDate: string,
    endDate: string,
    shiftSummary_: any[]
  ): Promise<any> => {
    try {
      const shifts = await Shift.find({
        agencyId: new Types.ObjectId(agencyId),
        homeId: new Types.ObjectId(homeId),
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });
      const timesheets = await this.timesheetService.getTimeSheetsByUserAndDate(
        agencyId,
        startDate,
        endDate,
        "agency"
      );

      const { shiftSummary, totalAmount } = await this.calculateShiftSummary(
        timesheets
      );

      console.log("shiftSummary", shiftSummary);

      const invoice = new Invoice({
        agencyId,
        homeId,
        startDate,
        endDate,
        shiftSummary,
        totalAmount,
      });

      await invoice.save();
      return invoice;
    } catch (error: any) {
      Logger.error(
        "InvoiceService: createInvoice",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };

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

  public getInvoices = async (userId: string): Promise<any> => {
    try {
      const objectId = new Types.ObjectId(userId);

      return await Invoice.find({
        $or: [{ agencyId: objectId }, { homeId: objectId }],
      })
        .populate("agencyId", "fname lname email company")
        .populate("homeId", "fname lname email company")
        .sort({ createdAt: -1 });
    } catch (error: any) {
      Logger.error(
        "InvoiceService: getInvoices",
        "errorInfo:" + JSON.stringify(error)
      );
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

  public updateInvoiceStatus = async (
    invoiceId: string,
    status: string
  ): Promise<any> => {
    try {
      return await Invoice.findByIdAndUpdate(
        invoiceId,
        { status },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "InvoiceService: updateInvoiceStatus",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };
}

export default InvoiceService;
