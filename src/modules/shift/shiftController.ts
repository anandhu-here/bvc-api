import { Response } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import ShiftService from "src/services/ShiftService";
import { Types } from "mongoose";
import Logger from "src/logger";
import UserService from "src/services/UserService";
import PushNotification from "src/services/PushNotificationService";
import UserShiftTypeService from "src/services/ShiftPatternService";
import dayjs from "dayjs";
import CustomError from "src/helpers/ErrorHelper";

class ShiftController {
  private readonly _shiftSvc: ShiftService;
  private readonly _shiftTypeSvc: UserShiftTypeService;
  private readonly _userSvc: UserService;
  private readonly _pushSvc: PushNotification;

  constructor() {
    this._shiftSvc = new ShiftService();
    this._shiftTypeSvc = new UserShiftTypeService();
    this._userSvc = new UserService();
    this._pushSvc = new PushNotification();
  }

  public getUnacceptedShiftsForAgency = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const agencyId = req.user._id.toString();
      const shifts = await this._shiftSvc.getUnacceptedShiftsForAgency(
        agencyId
      );
      res.status(StatusCodes.OK).json(shifts);
    } catch (error: any) {
      Logger.error("Error getting unaccepted shifts for agency:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public acceptShiftByAgency = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const agencyId = req.currentOrganization?._id?.toString();

      const updatedShift = await this._shiftSvc.acceptShiftByAgency(
        shiftId,
        agencyId
      );
      res.status(StatusCodes.OK).json(updatedShift);
    } catch (error: any) {
      Logger.error("Error accepting shift by agency:", error);
      if (error.name === "CustomError") {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getQuickStats = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUser = req.user;
      const type = req.currentOrganization?.type;
      const { month, year } = req.query;

      const currentDate = new Date();
      const monthNum = month
        ? parseInt(month as string, 10)
        : currentDate.getMonth() + 1;
      const yearNum = year
        ? parseInt(year as string, 10)
        : currentDate.getFullYear();

      let stats;

      if (["carer", "nurse", "senior_carer"].includes(currentUser.role)) {
        stats = await this._shiftSvc.getCarerQuickStats(
          currentUser._id.toString(),
          monthNum,
          yearNum
        );
        res.status(StatusCodes.OK).json(stats);
      } else if (type === "agency") {
        stats = await this._shiftSvc.getAgencyQuickStats(
          req.currentOrganization?._id?.toString(),
          monthNum,
          yearNum
        );
        res.status(StatusCodes.OK).json(stats);
      } else if (type === "home") {
        stats = await this._shiftSvc.getHomeQuickStats(
          req.currentOrganization?._id?.toString(),
          monthNum,
          yearNum
        );
        res.status(StatusCodes.OK).json(stats);
      } else {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid organization type or user role" });
      }
    } catch (error: any) {
      console.error("Error getting quick stats:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getShiftById = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const shift = await this._shiftSvc.getShiftById(shiftId);
      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }
      res.status(StatusCodes.OK).json(shift);
    } catch (error: any) {
      // Logger.error("Error getting shift by id:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getPubShifts = async (req: IRequest, res: Response): Promise<void> => {
    try {
      let month: number;

      if (req.query.month !== "undefined") {
        month = parseInt(req.query.month as string);
      } else {
        month = dayjs().month() + 1;
      }
      let shifts: any[] = [];

      shifts = await this._shiftSvc.getPubShifts(
        req.currentOrganization?.id?.toString(),
        month
      );
      res.status(StatusCodes.OK).json(shifts);
    } catch (error: any) {
      // Logger.error("Error getting shifts:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };
  public getAgencyShifts = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      let shifts: any[] = [];

      let month = req.query.month as any;

      if (month === "undefined") {
        month = dayjs().month() + 1;
      }

      console.log(month, "....");

      shifts = await this._shiftSvc.getAgencyShifts(
        req.currentOrganization?.id?.toString(),
        month
      );
      res.status(StatusCodes.OK).json(shifts);
    } catch (error: any) {
      // Logger.error("Error getting shifts:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getShifts = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const currentUser = req.user;
      let shifts: any[] = [];

      shifts = await this._shiftSvc.getPubShifts(currentUser._id.toString());
      res.status(StatusCodes.OK).json(shifts);
    } catch (error: any) {
      // Logger.error("Error getting shifts:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getUnAcceptedShifts = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.user;

      if (currentUser.role !== "home") {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Only home accounts can get unaccepted shifts" });
        return;
      }

      const shifts = await this._shiftSvc.getunAcceptedShifts(
        currentUser._id.toString()
      );
      res.status(StatusCodes.OK).json(shifts);
    } catch (error: any) {
      // Logger.error("Error getting unaccepted shifts:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public createShift = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const shiftData = req.body;
      const currentUser = req.user;

      if (currentUser.role !== "home") {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Only home accounts can create shifts" });
        return;
      }

      const shiftTypeExists = await this._shiftTypeSvc.checkShiftPattern(
        req.currentOrganization._id.toString()
      );

      if (!shiftTypeExists) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type does not exist" });
        return;
      }

      const shiftPattern = shiftTypeExists.find(
        (type) => type._id.toString() === shiftData.shiftPattern.toString()
      );

      if (!shiftPattern) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid shift pattern" });
        return;
      }

      shiftData.homeId = currentUser._id.toString();

      const createdShift = {} as any;
      res.status(StatusCodes.CREATED).json(createdShift);
    } catch (error: any) {
      // Logger.error("Error creating shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public createAndAssignMultipleShifts = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftsData } = req.body;

      const agentId = shiftsData[0]?.agentId;

      const shiftTypeExists = await this._shiftTypeSvc.checkShiftPattern(
        req.currentOrganization._id.toString()
      );

      if (!shiftTypeExists) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type does not exist" });
        return;
      }

      const createdAndAssignedShifts =
        await this._shiftSvc.createAndAssignMultipleShifts(
          shiftsData,
          req.currentOrganization._id.toString(),
          req.currentOrganization.name
        );
      res.status(StatusCodes.CREATED).json(createdAndAssignedShifts);
    } catch (error: any) {
      console.log(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };
  public createMultipleShifts = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftsData } = req.body;

      const agentId = shiftsData[0]?.agentId;

      const shiftTypeExists = await this._shiftTypeSvc.checkShiftPattern(
        req.currentOrganization._id.toString()
      );

      if (!shiftTypeExists) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type does not exist" });
        return;
      }

      const createdShifts = await this._shiftSvc.createMultipleShifts(
        shiftsData,
        req.currentOrganization._id.toString(),
        req.currentOrganization.name
      );
      res.status(StatusCodes.CREATED).json(createdShifts);
    } catch (error: any) {
      console.log(error);
      // Logger.error("Error creating multiple shifts:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public updateShift = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const updatedShiftData = req.body;
      const currentUser = req.user;

      const shift = await this._shiftSvc.getShiftById(shiftId);

      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }

      if (shift.homeId.toString() !== req.currentOrganization._id.toString()) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Not authorized to update this shift" });
        return;
      }

      const shiftTypeExists = await this._shiftTypeSvc.checkShiftPattern(
        updatedShiftData.agentId
          ? updatedShiftData.agentId
          : req.currentOrganization._id.toString()
      );

      if (!shiftTypeExists) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type does not exist" });
        return;
      }

      const shiftPattern = shiftTypeExists.find(
        (type) =>
          type._id.toString() === updatedShiftData.shiftPattern.toString()
      );

      if (!shiftPattern) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid shift pattern" });
        return;
      }

      const updatedShift = await this._shiftSvc.updateShift(
        shiftId,
        updatedShiftData,
        shiftPattern
      );
      res.status(StatusCodes.OK).json(updatedShift);
    } catch (error: any) {
      // Logger.error("Error updating shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public deleteShift = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const result = await this._shiftSvc.deleteShift(shiftId);
      if (result) {
        res
          .status(StatusCodes.OK)
          .json({ message: "Shift deleted successfully" });
      } else {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
      }
    } catch (error: any) {
      // Logger.error("Error deleting shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public acceptShift = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const updatedShift = await this._shiftSvc.acceptShift(shiftId);
      if (!updatedShift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }
      res.status(StatusCodes.OK).json(updatedShift);
    } catch (error: any) {
      // Logger.error("Error accepting shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public rejectShift = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const currentUser = req.user;

      const shift = await this._shiftSvc.getShiftById(shiftId);

      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }

      if (shift.agentId?.toString() !== currentUser._id.toString()) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Not authorized to reject this shift" });
        return;
      }

      const updatedShift = await this._shiftSvc.rejectShift(shiftId);
      res.status(StatusCodes.OK).json(updatedShift);
    } catch (error: any) {
      // Logger.error("Error rejecting shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getAssignmentsForShift = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const assignments = await this._shiftSvc.getAssignmentsByShiftId(shiftId);
      res.status(StatusCodes.OK).json(assignments);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getSingleShift = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const shift = await this._shiftSvc.getShiftById(shiftId);
      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }
      res.status(StatusCodes.OK).json(shift);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getShiftWithAssignments = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const shift = await this._shiftSvc.getShiftById(shiftId);
      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }
      const assignments = await this._shiftSvc.getAssignmentsByShiftId(shiftId);
      res.status(StatusCodes.OK).json({ shift, assignments });
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public assignUsersToShifts = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { assignments } = req.body;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid assignments data" });
        return;
      }

      // Validate the structure of each assignment
      for (const assignment of assignments) {
        if (
          !assignment.shiftId ||
          !Array.isArray(assignment.userIds) ||
          assignment.userIds.length === 0
        ) {
          res.status(StatusCodes.BAD_REQUEST).json({
            message:
              "Invalid assignment structure. Each assignment must have a shiftId and a non-empty userIds array.",
          });
          return;
        }
      }

      const results = await this._shiftSvc.assignUsersToShifts(assignments);

      // Check if any assignments failed
      const hasErrors = results.some((result) => "error" in result);

      if (hasErrors) {
        // If there are any errors, send a 207 Multi-Status response
        res.status(StatusCodes.MULTI_STATUS).json(results);
      } else {
        // If all assignments were successful, send a 200 OK response
        res.status(StatusCodes.OK).json(results);
      }
    } catch (error: any) {
      Logger.error("Error in assignUsersToShifts controller:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "An unexpected error occurred while processing assignments.",
      });
    }
  };

  async getUpcomingUnassignedShifts(
    req: IRequest,
    res: IResponse
  ): Promise<void> {
    try {
      const { date, userId } = req.query;

      console.log("date:", date, "userId:", userId);

      if (!date || !userId) {
        res.status(400).json({ message: "Date and userId are required" });
        return;
      }

      const shifts = await this._shiftSvc.getUpcomingUnassignedShifts(
        date as string,
        userId as string
      );

      res.status(200).json(shifts);
    } catch (error) {
      console.error("Error in getUpcomingUnassignedShifts:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching upcoming shifts" });
    }
  }

  public unassignUserFromShift = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId, userId } = req.params;
      const orgId = req.currentOrganization?._id?.toString();

      if (!orgId) {
        throw new CustomError(
          "Organization not found",
          StatusCodes.BAD_REQUEST
        );
      }

      const shift = await this._shiftSvc.getShiftById(shiftId);

      if (!shift) {
        throw new CustomError("Shift not found", StatusCodes.NOT_FOUND);
      }

      if (
        shift.homeId.toString() !== orgId &&
        shift.agentId.toString() !== orgId
      ) {
        throw new CustomError(
          "Not authorized to unassign users from this shift",
          StatusCodes.FORBIDDEN
        );
      }

      const updatedShift = await this._shiftSvc.unassignUserFromShift(
        shiftId,
        userId
      );

      res.status(StatusCodes.OK).json({
        message: "User unassigned successfully",
        shift: updatedShift,
      });
    } catch (error: any) {
      Logger.error("Error in unassignUserFromShift controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "An unexpected error occurred" });
      }
    }
  };

  public updateAssignmentStatus = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const { status } = req.body;
      const currentUser = req.user;

      const assignment = await this._shiftSvc.getAssignmentById(assignmentId);

      if (!assignment) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Assignment not found" });
        return;
      }

      if (assignment.userId.toString() !== currentUser._id.toString()) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Not authorized to update this assignment" });
        return;
      }

      const updatedAssignment = await this._shiftSvc.updateAssignmentStatus(
        assignmentId,
        status
      );
      res.status(StatusCodes.OK).json(updatedAssignment);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getAssignmentsForUser = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user._id.toString();
      const assignments = await this._shiftSvc.getAssignmentsForUser(userId);
      res.status(StatusCodes.OK).json(assignments);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public generateQRCode = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      if (req.user.role !== "nurse") {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Only nurses can generate QR codes" });
        return;
      }
      const qrCodeData = await this._shiftSvc.generateQRCode(shiftId);
      Logger.info("QR code data:", qrCodeData);
      res.status(StatusCodes.OK).json(qrCodeData);
    } catch (error: any) {
      // Logger.error("Error generating QR code:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to generate QR code" });
    }
  };
  public verifyPublicKey = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const { publicKey, carerId } = req.body;

      if (!publicKey || !carerId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Public key and carer ID are required" });
        return;
      }

      const result = await this._shiftSvc.verifyPublicKey(
        shiftId,
        publicKey,
        carerId
      );
      res.status(StatusCodes.OK).json({ success: result });
    } catch (error: any) {
      // Logger.error("Error verifying public key:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to verify public key" });
    }
  };

  public replaceCarerInShift = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId } = req.params;
      const { oldCarerId, newCarerId } = req.body;
      const currentUser = req.user;

      if (currentUser.role !== "home") {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Only home accounts can replace carers in shifts" });
        return;
      }

      const shift = await this._shiftSvc.getShiftById(shiftId);

      if (!shift) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Shift not found" });
        return;
      }

      if (shift.homeId.toString() !== currentUser._id.toString()) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Not authorized to replace carer in this shift" });
        return;
      }

      const oldCarer = await this._userSvc.findUserByIdExc(oldCarerId);
      const newCarer = await this._userSvc.findUserByIdExc(newCarerId);

      if (!oldCarer || !newCarer) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "One or both carers not found" });
        return;
      }

      const updatedShift = await this._shiftSvc.replaceCarerInShift(
        shiftId,
        oldCarerId,
        newCarerId
      );
      res.status(StatusCodes.OK).json(updatedShift);
    } catch (error: any) {
      // Logger.error("Error replacing carer in shift:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  //barcode

  public generateBarcode = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftId, homeId, shiftPattern } = req.body;
      const currentOrgnaization = req.currentOrganization;
      const barcodeData = await this._shiftSvc.generateBarcode(
        shiftId,
        req.user._id.toString(),
        currentOrgnaization.type === "agency"
          ? currentOrgnaization._id.toString()
          : null,
        homeId,
        shiftPattern
      );
      res.status(StatusCodes.OK).json(barcodeData);
    } catch (error: any) {
      console.log(error);
      // Logger.error("Error generating barcode:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  // Additional helper methods if needed

  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  private handleError(res: Response, error: any, message: string): void {
    // Logger.error(message, error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: StringValues.INTERNAL_SERVER_ERROR });
  }
}

export default ShiftController;
