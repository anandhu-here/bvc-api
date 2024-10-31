import { EHttpMethod } from "../../enums";
import type { IRequest, IResponse, INext } from "../../interfaces/core/express";
import ApiError from "../../exceptions/ApiError";
import StatusCodes from "../../constants/statusCodes";
import StringValues from "../../constants/strings";
import Logger from "../../logger";
import type ProfileService from "src/services/ProfileService";
import UserService from "src/services/UserService";
import AnnualLeaveServices from "src/services/AnnualLeaveServices";

class ProfileController {
  private readonly _userSvc: UserService;
  private readonly _profileSvc: ProfileService;
  private readonly _leaveSvc: AnnualLeaveServices;

  constructor(
    readonly profileSvc: ProfileService,
    readonly userSvc: UserService
  ) {
    this._profileSvc = profileSvc;
    this._userSvc = userSvc;
    this._leaveSvc = new AnnualLeaveServices();
  }

  public getProfileDetails = async (
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
      const currentUser = req.currentUser;
      const token = req.token;

      const { password, salt, ...profile } = currentUser;

      // Get counts of linked users
      const staffs = await this._profileSvc.getLinkedUsers(
        currentUser._id.toString(),
        "staffs"
      );
      const homes = await this._profileSvc.getLinkedUsers(
        currentUser._id.toString(),
        "home"
      );
      const agencies = await this._profileSvc.getLinkedUsers(
        currentUser._id.toString(),
        "agency"
      );

      const profileData = {
        ...profile,
        staffs: staffs.map((staff) => staff?._id),
        homes: homes.map((home) => home?._id),
        agencies: agencies.map((agency) => agency?._id),
      };

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        token: token,
        data: profileData,
      });
    } catch (error: any) {
      console.log("Error in getProfileDetails:", error);
      Logger.error(
        "ProfileController: getProfileDetails",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getLinkedUsers = async (
    req: IRequest,
    res: IResponse
  ): Promise<any> => {
    try {
      const currentUser = req.currentUser;
      const { accountType } = req.params;
      const gettingFor = req.query.for as string | undefined;

      Logger.info(`Fetching linked users of type: ${accountType}`);

      const linkedUsers = await this._profileSvc.getLinkedUsers(
        currentUser._id.toString(),
        accountType,
        gettingFor
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Linked users retrieved successfully",
        data: linkedUsers,
      });
    } catch (error: any) {
      Logger.error(
        "ProfileController: getLinkedUsers",
        "errorInfo:" + JSON.stringify(error)
      );

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getStaffs = async (req: IRequest, res: IResponse): Promise<any> => {
    try {
      const currentUser = req.currentUser;
      const date = req.query.date as string;

      const staffs = await this._profileSvc.getStaffsForAssign(
        currentUser._id.toString(),
        date
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Staffs retrieved successfully",
        data: staffs,
      });
    } catch (error: any) {
      Logger.error(
        "ProfileController: getStaffs",
        "errorInfo:" + JSON.stringify(error)
      );

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public updateFcmToken = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.currentUser;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "FCM token is required" });
        return;
      }

      const updatedUser = await this._profileSvc.updateFcmToken(
        currentUser._id.toString(),
        fcmToken
      );

      res.status(StatusCodes.OK).json(updatedUser);
    } catch (error: any) {
      console.error("Error updating FCM token:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public updateAvailabilities = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.currentUser;
      const { dates } = req.body;

      if (!Array.isArray(dates) || dates.length === 0) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Dates array is required and cannot be empty" });
        return;
      }

      const updatedUser = await this._profileSvc.updateAvailabilities(
        currentUser._id.toString(),
        dates
      );

      res.status(StatusCodes.OK).json(updatedUser);
    } catch (error: any) {
      console.error("Error updating availabilities:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public deleteAvailability = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const currentUser = req.currentUser;
      const { date } = req.params;

      const updatedUser = await this._profileSvc.deleteAvailability(
        currentUser._id.toString(),
        date
      );

      res.status(StatusCodes.OK).json(updatedUser);
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public searchUsers = async (
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
      const { accountType } = req.params;
      let { companyName } = req.query;

      if (!accountType && !companyName) {
        return next(
          new ApiError(
            StringValues.SEARCH_CRITERIA_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (companyName === undefined || companyName === "") {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: StringValues.SUCCESS,
          data: [],
        });
      }

      if (typeof companyName === "string") {
        companyName = companyName.replace(/^['"]|['"]$/g, "");
      }

      const users = await this._userSvc.searchUsersExc(
        accountType as string,
        companyName as string
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: users,
      });
    } catch (error: any) {
      Logger.error(
        "ProfileController: searchUsers",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getUsers = async (req: IRequest, res: IResponse): Promise<any> => {
    try {
      const accountType = req.params.userType;
      if (accountType === undefined || accountType === "null") {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: StringValues.SUCCESS,
          data: [],
        });
      }
      const users = await this._userSvc.getUsers(accountType);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: users,
      });
    } catch (error: any) {
      Logger.error(
        "ProfileController: getUsers",
        "errorInfo:" + JSON.stringify(error)
      );

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public verifyEmail = async (req: IRequest, res: IResponse): Promise<any> => {
    try {
      const { token } = req.body;
      if (!token) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Token is required" });
      }
      const user = await this._userSvc.verifyEmail(token);
      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Invalid token" });
      }
      await this._userSvc.emailVerified(user._id.toString());
      res.status(StatusCodes.OK).json(user);
    } catch (error: any) {
      console.error("Error verifying email:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getCarerResume = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const carerId = req.params.carerId;
      const carerResume = await this._userSvc.getCarerResume(carerId);
      res.status(200).json(carerResume);
    } catch (error: any) {
      console.error("Error fetching carer resume:", error);
      res
        .status(500)
        .json({ message: "Error fetching carer resume", error: error.message });
    }
  };

  public configureAnnualLeave = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { staffType, daysPerYear } = req.body;
      const updatedUser = await this._leaveSvc.configureAnnualLeave(
        req.currentUser._id.toString(),
        staffType,
        daysPerYear
      );
      res.status(StatusCodes.OK).json(updatedUser);
    } catch (error: any) {
      console.error("Error configuring annual leave:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error configuring annual leave" });
    }
  };

  public getAnnualLeaveConfig = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const config = await this._leaveSvc.getAnnualLeaveConfig(
        req.currentUser._id.toString()
      );
      res.status(StatusCodes.OK).json(config);
    } catch (error: any) {
      console.error("Error getting annual leave config:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error getting annual leave config" });
    }
  };

  public requestAnnualLeave = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { startDate, endDate } = req.body;
      const leaveRequest = await this._leaveSvc.requestAnnualLeave(
        req.currentUser._id.toString(),
        new Date(startDate),
        new Date(endDate)
      );
      res.status(StatusCodes.OK).json(leaveRequest);
    } catch (error: any) {
      console.error("Error requesting annual leave:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error requesting annual leave" });
    }
  };

  public getAnnualLeaveRequests = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { status } = req.query;
      const requests = await this._leaveSvc.getAnnualLeaveRequests(
        req.currentUser._id.toString(),
        status as string | undefined
      );
      res.status(StatusCodes.OK).json(requests);
    } catch (error: any) {
      console.error("Error getting annual leave requests:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error getting annual leave requests" });
    }
  };

  public approveAnnualLeave = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { leaveId } = req.params;
      const approvedLeave = await this._leaveSvc.approveAnnualLeave(
        leaveId,
        req.currentUser._id.toString()
      );
      res.status(StatusCodes.OK).json(approvedLeave);
    } catch (error: any) {
      console.error("Error approving annual leave:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error approving annual leave" });
    }
  };
}

export default ProfileController;
