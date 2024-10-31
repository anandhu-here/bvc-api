import type { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import { EHttpMethod } from "src/enums";
import ApiError from "src/exceptions/ApiError";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import Logger from "src/logger";
import FCMTokenServices from "src/services/Notifications";
class FCMController {
  private fcmTokenSvc: FCMTokenServices;

  constructor() {
    this.fcmTokenSvc = new FCMTokenServices();
  }

  public registerToken = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const { token, device } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const fcmToken = await this.fcmTokenSvc.registerToken(
        user.id,
        token,
        device
      );

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: "FCM token registered successfully",
        data: fcmToken,
      });
    } catch (error: any) {
      Logger.error("FCMController: registerToken", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getTokens = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const user = req.user;

      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const tokens = await this.fcmTokenSvc.getTokensByUser(user.id);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "FCM tokens fetched successfully",
        data: tokens,
      });
    } catch (error: any) {
      Logger.error("FCMController: getTokens", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public deleteToken = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.DELETE) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const { token } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
        });
      }

      await this.fcmTokenSvc.deleteToken(user.id, token);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "FCM token deleted successfully",
      });
    } catch (error: any) {
      Logger.error("FCMController: deleteToken", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default FCMController;
