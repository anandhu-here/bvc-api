import { Response } from "express";
import StatusCodes from "src/constants/statusCodes";
import { IRequest, IResponse } from "src/interfaces/core/new";
import TimesheetService from "src/services/TimesheetService";
import Logger from "src/logger";
import ShiftTypeService from "src/services/ShiftPatternService";
import dayjs from "dayjs";
import OrganizationServices from "src/services/OrgServices";

class TimesheetController {
  private readonly timesheetService: TimesheetService;
  private readonly shiftPatternService: ShiftTypeService;
  private readonly orgSvc: OrganizationServices;

  constructor() {
    this.timesheetService = new TimesheetService();
    this.shiftPatternService = new ShiftTypeService();
    this.orgSvc = new OrganizationServices();
  }

  private handleError(
    error: any,
    res: Response,
    message: string = "Internal server error"
  ): void {
    Logger.error(`Timesheet Controller Error - ${message}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message });
  }

  private validateRequest(
    req: IRequest,
    requiredFields: string[]
  ): string | null {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return `${field} is required`;
      }
    }
    return null;
  }

  public uploadManualTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId, shiftPatternId, homeId, userId } = req.body;
      const file = req.files?.file as any;

      if (!file) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "File is required" });
        return;
      }

      const url = await this.timesheetService.uploadManualTimesheet(
        userId,
        file
      );
      const timesheet = await this.timesheetService.createTimesheet({
        shiftId,
        userId,
        shiftPatternId,
        organizationId: req.currentOrganization?._id.toString(),
        homeId,
        documentUrl: url,
      });

      res.status(StatusCodes.CREATED).json({ timesheet });
    } catch (error) {
      this.handleError(error, res, "Error uploading manual timesheet");
    }
  };

  public createManualTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const validationError = this.validateRequest(req, [
        "shiftId",
        "shiftPatternId",
        "homeId",
        "userId",
      ]);
      if (validationError) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: validationError });
        return;
      }

      const { shiftId, shiftPatternId, homeId, userId } = req.body;
      const timing = await this.shiftPatternService.getShiftPatternTimingByHome(
        shiftPatternId,
        userId
      );

      const timesheet = await this.timesheetService.createTimesheet({
        shiftId,
        userId,
        shiftPatternId,
        organizationId: req.currentOrganization?._id.toString(),
        homeId,
        documentUrl: "manual",
      });

      res.status(StatusCodes.CREATED).json({
        message: "Timesheet created successfully",
        timesheet,
      });
    } catch (error) {
      this.handleError(error, res, "Error creating manual timesheet");
    }
  };

  public createTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId, shiftPatternId, homeId } = req.body;
      if (!shiftId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift ID is required" });
        return;
      }

      const carerId = req.user._id.toString();
      const organizationId =
        req.currentOrganization?.type === "agency"
          ? req.currentOrganization?._id.toString()
          : null;

      const timesheet = await this.timesheetService.createTimesheet({
        shiftId,
        userId: carerId,
        shiftPatternId,
        organizationId,
        homeId,
      });

      res.status(StatusCodes.CREATED).json({
        message: "Timesheet created successfully",
        timesheet,
      });
    } catch (error) {
      this.handleError(error, res, "Error creating timesheet");
    }
  };

  public getTimesheets = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { role: accountType, _id } = req.user;
      const orgType = req.currentOrganization?.type;
      const orgId = req.currentOrganization?._id.toString();

      // Get pagination parameters from query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status =
        (req.query.status as "all" | "approved" | "pending" | "rejected") ||
        "all";

      let startDate = dayjs().startOf("month").toDate();
      let endDate = dayjs().endOf("month").toDate();

      if (req.query.startDate && req.query.endDate) {
        startDate = dayjs(req.query.startDate as string).toDate();
        endDate = dayjs(req.query.endDate as string).toDate();
      }

      const result = await this.timesheetService.getTimesheetsByRole(
        req.staffType,
        _id.toString(),
        orgType,
        orgId,
        { page, limit },
        status,
        startDate,
        endDate
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error) {
      this.handleError(error, res, "Error getting timesheets");
    }
  };

  public getTimesheetsByHomeId = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const homeId = req.user._id.toString();
      const timesheets = await this.timesheetService.getTimesheetsByHomeId(
        homeId
      );
      res.status(StatusCodes.OK).json(timesheets);
    } catch (error) {
      this.handleError(error, res, "Error getting timesheets by home ID");
    }
  };

  public approveTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { timesheetId } = req.params;
      const { rating, review } = req.body;

      const updatedTimesheet = await this.timesheetService.approveTimesheet(
        timesheetId,
        rating,
        review
      );
      if (!updatedTimesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(updatedTimesheet);
    } catch (error) {
      this.handleError(error, res, "Error approving timesheet");
    }
  };
  // barcode

  public scanBarcode = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { barcode, carerId } = req.body;

      const orgType = req.currentOrganization?.type;

      const timesheet = await this.timesheetService.scanBarcode(
        req.user._id.toString(),
        carerId,
        barcode
      );

      if (!timesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(timesheet);
    } catch (error) {
      this.handleError(error, res, "Error scanning barcode");
    }
  };

  public checkTimesheetStatus = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const qrCode = req.query.qrCode as string;
      if (!qrCode) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "QR code is required" });
        return;
      }
      const timesheet = await this.timesheetService.checkTimesheetStatus(
        req.user._id.toString(),
        qrCode
      );

      if (!timesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(timesheet);
    } catch (error) {
      this.handleError(error, res, "Error checking timesheet status");
    }
  };

  public rejectTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { timesheetId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Rejection reason is required" });
        return;
      }

      const updatedTimesheet = await this.timesheetService.rejectTimesheet(
        timesheetId,
        reason
      );
      if (!updatedTimesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(updatedTimesheet);
    } catch (error) {
      this.handleError(error, res, "Error rejecting timesheet");
    }
  };

  public getTimesheetById = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { timesheetId } = req.params;
      const timesheet = await this.timesheetService.getTimesheetById(
        timesheetId
      );

      if (!timesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(timesheet);
    } catch (error) {
      this.handleError(error, res, "Error getting timesheet by ID");
    }
  };

  public updateTimesheet = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { timesheetId } = req.params;
      const updateData = req.body;

      const updatedTimesheet = await this.timesheetService.updateTimesheet(
        timesheetId,
        updateData
      );
      if (!updatedTimesheet) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timesheet not found" });
        return;
      }

      res.status(StatusCodes.OK).json(updatedTimesheet);
    } catch (error) {
      this.handleError(error, res, "Error updating timesheet");
    }
  };

  //barcode
}

export default TimesheetController;
