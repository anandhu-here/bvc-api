import StatusCodes from "src/constants/statusCodes";
import { IRequest, IResponse } from "src/interfaces/core/express";
import AnnualLeaveServices from "src/services/AnnualLeaveServices";

class AnnualLeaveController {
  private _leaveSvc: AnnualLeaveServices;

  constructor() {
    this._leaveSvc = new AnnualLeaveServices();
  }

  public configureAnnualLeave = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { staffType, daysPerYear } = req.body;
      const updatedUser = await this._leaveSvc.configureAnnualLeave(
        req.currentUser._id as string,
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
      console.log(req.currentUser._id, "andi");
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
        req.currentUser._id as string,
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
      const staffId = req.params.staffId;
      const requests = await this._leaveSvc.getAnnualLeaveRequests(
        staffId as string,
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
        req.currentUser._id as string
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

export default AnnualLeaveController;
