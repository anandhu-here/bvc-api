import { Response } from "express";
import { Types } from "mongoose";
import StatusCodes from "src/constants/statusCodes";
import { IRequest, IResponse } from "src/interfaces/core/express";
import TimelineService from "src/services/TimelineService";

class TimelineController {
  private readonly _timelineService: TimelineService;

  constructor() {
    this._timelineService = new TimelineService();
  }

  /**
   * Retrieves the current agency details for the logged-in carer.
   * @param {IRequest} req - The request object.
   * @param {IResponse} res - The response object.
   */
  public getCurrentCompany = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const carerId = req.currentUser._id;
      const currentCompany = await this._timelineService.getCurrentCompany(
        carerId as Types.ObjectId
      );

      if (!currentCompany) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Current agency not found" });
        return;
      }

      res.status(StatusCodes.OK).json(currentCompany);
    } catch (error: any) {
      console.error("Error getting current agency:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  };

  /**
   * Retrieves the previous agencies for the logged-in carer.
   * @param {IRequest} req - The request object.
   * @param {IResponse} res - The response object.
   */
  public getPreviousCompanies = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const carerId = req.currentUser._id;
      const previousCompanies =
        await this._timelineService.getPreviousCompanies(
          carerId as Types.ObjectId
        );

      res.status(StatusCodes.OK).json(previousCompanies);
    } catch (error: any) {
      console.error("Error getting previous agencies:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  };

  /**
   * Adds a new agency to the carer's timeline.
   * @param {IRequest} req - The request object, containing the new agency details.
   * @param {IResponse} res - The response object.
   */
  public addCompanyToTimeline = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const carerId = req.currentUser._id;
      const { newCompanyId, newAgencyStartDate, newAgencyDescription } =
        req.body;

      const updatedTimeline = await this._timelineService.addCompanyToTimeline(
        carerId as Types.ObjectId,
        newCompanyId,
        newAgencyStartDate,
        newAgencyDescription,
        req.currentUser.accountType
      );

      res.status(StatusCodes.OK).json(updatedTimeline);
    } catch (error: any) {
      console.error("Error adding agency to timeline:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  };
  /**
   * Removes the current agency from the carer's timeline.
   * @param {IRequest} req - The request object.
   * @param {IResponse} res - The response object.
   */
  public removeCurrentCompany = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const carerId = req.currentUser._id;
      const updatedTimeline = await this._timelineService.removeCurrentCompany(
        carerId as Types.ObjectId
      );

      if (!updatedTimeline) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Timeline not found" });
        return;
      }

      res.status(StatusCodes.OK).json(updatedTimeline);
    } catch (error: any) {
      console.error("Error removing current agency:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  };
}

export default TimelineController;
