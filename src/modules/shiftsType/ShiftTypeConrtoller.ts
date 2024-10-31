import { EHttpMethod } from "../../enums";
import StatusCodes from "../../constants/statusCodes";
import StringValues from "../../constants/strings";
import ApiError from "../../exceptions/ApiError";
import type { IRequest, IResponse, INext } from "../../interfaces/core/express";
import Logger from "../../logger";
import type { IUserShiftType } from "src/interfaces/entities/shift-types";
import type UserShiftService from "src/services/ShiftTypeService";
import type { RequestShiftType } from "src/interfaces/requests/shifttype.interface";

class UserShiftController {
  private readonly _userShiftSvc: UserShiftService;

  constructor(readonly userShiftSvc: UserShiftService) {
    this._userShiftSvc = userShiftSvc;
  }

  // Create user shifts
  public createUserShiftsTypes = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const currentUser = req.currentUser;
      const data = req.body;

      if (!data) {
        return next(
          new ApiError(
            StringValues.INVALID_REQUEST_BODY,
            StatusCodes.BAD_REQUEST
          )
        );
      }
      if (data.shifts.length === 0) {
        return next(
          new ApiError(
            StringValues.SHIFT_TYPE_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Perform necessary validations on the request data

      const newUserShiftData: IUserShiftType = {
        userId: currentUser._id as string,
        shifttypes: data.shifts,
      };

      const userShift = await this._userShiftSvc.createExc(newUserShiftData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: StringValues.SUCCESS,
        data: userShift,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;

      Logger.error(
        "UserShiftController: createUserShifts",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Get user shifts
  public getUserShiftTypes = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const { userId } = req.params;

      // Convert "null" string to actual null
      const parsedUserId = userId === "null" ? null : userId;

      const currentUser = req.currentUser;

      const queryId = parsedUserId || currentUser._id.toString();

      const userShift = await this._userShiftSvc.findByUserIdExc(queryId);

      if (!userShift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: StringValues.USER_SHIFT_TYPE_NOT_FOUND,
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: userShift,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;

      Logger.error(
        "UserShiftController: getUserShiftTypes",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      return res.json({
        success: false,
        error: errorMessage,
      });
    }
  };

  //   delete shift type
  public deleteShiftType = async (
    req: RequestShiftType,
    res: IResponse
  ): Promise<any> => {
    try {
      const { shiftTypeId } = req.params;
      const userId = req.currentUser._id as string;
      if (!userId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
      }
      if (!shiftTypeId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type ID is required" });
      }

      const deletedShiftType = await this._userShiftSvc.deleteShiftType(
        userId,
        shiftTypeId
      );
      console.log("deletedShiftType", deletedShiftType);
      res
        .status(StatusCodes.OK)
        .json({ message: StringValues.SUCCESS, data: deletedShiftType });
    } catch (error: any) {
      console.error("Error deleting shift type:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  public deleteUserShift = async (
    req: RequestShiftType,
    res: IResponse
  ): Promise<any> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
      }

      const deletedUserShift = await this._userShiftSvc.deleteUserShift(userId);
      console.log("deletedUserShift", deletedUserShift);
      res.status(StatusCodes.OK).json({ message: StringValues.SUCCESS });
    } catch (error: any) {
      console.error("Error deleting user shift:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  public editShiftType = async (
    req: RequestShiftType,
    res: IResponse
  ): Promise<any> => {
    try {
      const userId = req.currentUser._id as string;
      const { shiftTypeId } = req.params;
      const { data } = req.body;
      if (!userId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
      }
      if (!shiftTypeId) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Shift type ID is required" });
      }
      if (!data) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Updated shift type is required" });
      }

      const userShift = await this._userShiftSvc.editShiftType(
        userId,
        shiftTypeId,
        data
      );
      console.log("data", userShift);
      res
        .status(StatusCodes.OK)
        .json({ message: StringValues.SUCCESS, data: userShift });
    } catch (error: any) {
      console.error("Error updating shift type:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

export default UserShiftController;
