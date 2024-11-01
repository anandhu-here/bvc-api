import { Response } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import type { IRequest } from "src/interfaces/core/new";
import Logger from "src/logger";
import CustomError from "src/helpers/ErrorHelper";
import AgencyAnalyticsService from "src/services/OrganizationOverviewService";

class AgencyAnalyticsController {
  private readonly _analyticsSvc: AgencyAnalyticsService;

  constructor() {
    this._analyticsSvc = new AgencyAnalyticsService();
  }

  public getDashboardMetrics = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const metrics = await this._analyticsSvc.getAgencyDashboardMetrics(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(metrics);
    } catch (error: any) {
      Logger.error("Error getting dashboard metrics:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getStaffMetrics = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const staffMetrics = await this._analyticsSvc.getStaffMetrics(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(staffMetrics);
    } catch (error: any) {
      Logger.error("Error getting staff metrics:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getShiftMetrics = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const shiftMetrics = await this._analyticsSvc.getShiftMetrics(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(shiftMetrics);
    } catch (error: any) {
      Logger.error("Error getting shift metrics:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getRevenueMetrics = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const revenueMetrics = await this._analyticsSvc.getRevenueMetrics(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(revenueMetrics);
    } catch (error: any) {
      Logger.error("Error getting revenue metrics:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getCareHomeMetrics = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const careHomeMetrics = await this._analyticsSvc.getCareHomeMetrics(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(careHomeMetrics);
    } catch (error: any) {
      Logger.error("Error getting care home metrics:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getStaffingDemandTrends = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const { period = "week" } = req.query;

      if (!["week", "month"].includes(period as string)) {
        throw new CustomError(
          "Invalid period specified",
          StatusCodes.BAD_REQUEST
        );
      }

      const trends = await this._analyticsSvc.getStaffingDemandTrends(
        req.currentOrganization._id.toString(),
        period as "week" | "month"
      );

      res.status(StatusCodes.OK).json(trends);
    } catch (error: any) {
      Logger.error("Error getting staffing demand trends:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  public getUpcomingRequirements = async (
    req: IRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (req.currentOrganization?.type !== "agency") {
        throw new CustomError("Unauthorized access", StatusCodes.FORBIDDEN);
      }

      const requirements = await this._analyticsSvc.getUpcomingRequirements(
        req.currentOrganization._id.toString()
      );

      res.status(StatusCodes.OK).json(requirements);
    } catch (error: any) {
      Logger.error("Error getting upcoming requirements:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: StringValues.INTERNAL_SERVER_ERROR });
      }
    }
  };

  // Helper method for consistent error handling
  private handleError(res: Response, error: any): void {
    Logger.error("Error in AgencyAnalytics:", error);
    const statusCode =
      error instanceof CustomError
        ? error.statusCode
        : StatusCodes.INTERNAL_SERVER_ERROR;
    const message =
      error instanceof CustomError
        ? error.message
        : StringValues.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({ message });
  }
}

export default AgencyAnalyticsController;
