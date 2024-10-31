import { StatusCodes } from "http-status-codes";
import type { IRequest, IResponse } from "src/interfaces/core/new";

import ShiftTypeService from "src/services/ShiftPatternService";
import UserService from "src/services/UserService";
import { Types } from "mongoose";

class ShiftTypeController {
  private shiftTypeService: ShiftTypeService;
  private userSvc: UserService;

  constructor() {
    this.shiftTypeService = new ShiftTypeService();
    this.userSvc = new UserService();
  }

  public createYourShiftPattern = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.user;
      const organization = req.currentOrganization;

      const result = await this.shiftTypeService.createShiftPattern(
        req.body,
        organization._id.toString()
      );

      res.status(StatusCodes.CREATED).json(result);
    } catch (error: any) {
      console.log("error", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating shift type", error });
    }
  };

  public createShiftType = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { userId, shiftType } = req.body;
      let result;

      const user = await this.userSvc.findUserByIdExc(userId);

      const new_pattern = await this.shiftTypeService.createShiftPattern(
        shiftType,
        req.user._id as Types.ObjectId
      );

      res.status(StatusCodes.CREATED).json(result);
    } catch (error: any) {
      console.log("error", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating shift type", error });
    }
  };

  public getOtherShiftpattern = async (req: IRequest, res: IResponse) => {
    try {
      const userId = req.params.userId;
      console.log(userId, "mayandi");
      const result = await this.shiftTypeService.getShiftPattern(userId);
      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      console.log(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching shift types", error });
    }
  };

  public getYourShiftPattern = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.user;

      const orgId = req.currentOrganization._id.toString();

      const result = await this.shiftTypeService.getShiftPattern(orgId);

      if (!result) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Shift types not found" });
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      console.log(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching shift types", error });
    }
  };

  public getShiftTypes = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { userId, agencyId } = req.params;
      let result;
      console.log("userId", userId);

      const user = await this.userSvc.findUserByIdExc(userId);
      console.log("user", user.accountType);

      result = await this.shiftTypeService.getShiftPattern(userId);

      if (!result) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Shift types not found" });
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      console.log(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching shift types", error });
    }
  };

  public updateYourShiftPattern = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.user;

      const orgId = req.currentOrganization._id.toString();
      const shiftTypeId = req.params.shiftTypeId;

      const result = await this.shiftTypeService.updateYourShiftPattern(
        orgId,
        shiftTypeId,
        req.body
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error updating shift type", error });
    }
  };

  public updateShiftType = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { userId, shiftTypeId } = req.params;
      const updatedShiftType = req.body;
      let result;

      const user = await this.userSvc.findUserByIdExc(userId);

      if (user.accountType === "home") {
        result = await this.shiftTypeService.updateHomeShiftType(
          userId,
          shiftTypeId,
          updatedShiftType
        );
      } else if (user.accountType === "agency") {
        result = await this.shiftTypeService.updateAgencyShiftType(
          userId,
          shiftTypeId,
          updatedShiftType
        );
      } else {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Either userId or agencyId is required" });
        return;
      }

      if (!result) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Shift type not found" });
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error updating shift type", error });
    }
  };

  public deleteYourShiftPattern = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { shiftTypeId } = req.params;
      let result;

      const userId = req.user._id.toString();

      const user = await this.userSvc.findUserByIdExc(userId);

      result = await this.shiftTypeService.deleteShiftPattern(
        userId,
        shiftTypeId
      );

      res
        .status(StatusCodes.OK)
        .json({ message: "Shift type deleted successfully" });
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error deleting shift type", error });
    }
  };

  public deleteShiftType = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { userId, shiftTypeId } = req.params;
      let result;

      const user = await this.userSvc.findUserByIdExc(userId);

      if (user.accountType === "home") {
        result = await this.shiftTypeService.deleteHomeShiftType(
          userId,
          shiftTypeId
        );
      } else if (user.accountType === "agency") {
        result = await this.shiftTypeService.deleteAgencyShiftType(
          userId,
          shiftTypeId
        );
      } else {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Either userId or agencyId is required" });
        return;
      }

      if (!result) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Shift type not found" });
        return;
      }

      res
        .status(StatusCodes.OK)
        .json({ message: "Shift type deleted successfully" });
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error deleting shift type", error });
    }
  };
}

export default ShiftTypeController;
