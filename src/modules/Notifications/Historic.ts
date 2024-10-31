import { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import { EHttpMethod } from "src/enums";
import ApiError from "src/exceptions/ApiError";
import { IRequest, IResponse } from "src/interfaces/core/new";
import Logger from "src/logger";
import HistoricNotificationService from "src/services/HistoricNotifications";

class HistoricNotificationController {
  private historicNotificationSvc: HistoricNotificationService;

  constructor() {
    this.historicNotificationSvc = new HistoricNotificationService();
  }

  public getUnreadCount = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const user = req.user;
      if (!user) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const unreadCount =
        await this.historicNotificationSvc.getUnreadNotificationCount(
          user.id,
          req.currentOrganization?._id.toString()
        );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Unread notification count fetched successfully",
        data: unreadCount,
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: getUnreadCount", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public createNotification = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const { type, priority, title, content, metadata, recipients } = req.body;
      const user = req.user;

      if (!user || !req.currentOrganization._id) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message:
            "User not authenticated or not associated with an organization",
        });
        return;
      }

      const notification =
        await this.historicNotificationSvc.createNotification({
          organization: req.currentOrganization._id.toString(),
          type,
          priority,
          title,
          content,
          metadata,
          recipients,
          createdBy: user.id,
        });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Historic notification created successfully",
        data: notification,
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: createNotification", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getNotifications = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const user = req.user;
      if (!user || !req.currentOrganization._id) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message:
            "User not authenticated or not associated with an organization",
        });
        return;
      }

      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;

      const { notifications, totalCount, nextCursor } =
        await this.historicNotificationSvc.getNotifications(
          user.id,
          req.currentOrganization._id.toString(),
          {
            cursor,
            limit,
          }
        );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Historic notifications fetched successfully",
        data: {
          notifications,
          totalCount,
          nextCursor,
        },
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: getNotifications", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public markAsRead = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.PUT) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const { notificationId } = req.params;
      const user = req.user;

      if (!user) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const updatedNotification = await this.historicNotificationSvc.markAsRead(
        notificationId,
        user.id
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Notification marked as read successfully",
        data: updatedNotification,
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: markAsRead", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public deleteNotification = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.DELETE) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const { notificationId } = req.params;
      const user = req.user;

      if (!user || !req.currentOrganization._id) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message:
            "User not authenticated or not associated with an organization",
        });
        return;
      }

      await this.historicNotificationSvc.deleteNotification(
        notificationId,
        user.id,
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Historic notification deleted successfully",
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: deleteNotification", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public markAllAsRead = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== EHttpMethod.PUT) {
      return next(
        new ApiError(
          StringValues.INVALID_REQUEST_METHOD,
          StatusCodes.METHOD_NOT_ALLOWED
        )
      );
    }

    try {
      const user = req.user;

      if (!user || !req.currentOrganization._id.toString()) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message:
            "User not authenticated or not associated with an organization",
        });
        return;
      }

      await this.historicNotificationSvc.markAllAsRead(
        user.id,
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "All notifications marked as read successfully",
      });
    } catch (error: any) {
      Logger.error("HistoricNotificationController: markAllAsRead", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default HistoricNotificationController;
