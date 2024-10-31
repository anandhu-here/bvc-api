import type { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import { EHttpMethod } from "src/enums";
import ApiError from "src/exceptions/ApiError";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import Logger from "src/logger";
import JoinRequestServices from "src/services/new/JoinRequests";
import OrganizationServices from "src/services/OrgServices";

class JoinRequestController {
  private joinReqSvc: JoinRequestServices;
  private orgSvc: OrganizationServices;
  constructor() {
    this.joinReqSvc = new JoinRequestServices();
    this.orgSvc = new OrganizationServices();
  }

  public createJoinRequest = async (
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
      const data = req.body;
      const joinRequest = await this.joinReqSvc.createJoinRequest(data);

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: "Join request created successfully",
        data: joinRequest,
      });
    } catch (error: any) {
      Logger.error("JoinRequestController: createJoinRequest", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getJoinRequests = async (
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
          message: "User not found",
        });
      }
      if (user.role === "admin") {
        const org = await this.orgSvc.getOrganisationByOwner(
          user.id.toString()
        );
        if (!org) {
          return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Organization not found",
          });
        }
        const joinRequests = await this.joinReqSvc.getOrgJoinRequests(org.id);
        res.status(StatusCodes.OK);
        return res.json({
          success: true,
          message: "Join requests fetched successfully",
          data: joinRequests,
        });
      }
      //   const joinRequests = await this.joinReqSvc.getJoinRequests();

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Join requests fetched successfully",
        data: [],
      });
    } catch (error: any) {
      Logger.error("JoinRequestController: getJoinRequests", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default JoinRequestController;
