import dayjs from "dayjs";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import Logger from "src/logger";
import StaffService from "src/services/StaffServices";

class StaffController {
  private readonly staffSvc: StaffService;

  constructor() {
    this.staffSvc = new StaffService();
  }

  public getAllStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const staff = await this.staffSvc.getAllStaff(organizationId);
      res.json(staff);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching staff", error });
    }
  };

  public removeStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const staffId = req.params.staffId;
      const organizationId = req.currentOrganization?._id.toString();
      await this.staffSvc.removeStaff(staffId, organizationId);
      res.json({ message: "Staff removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error removing staff", error });
    }
  };

  public getAvailableStaffForShift = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { shiftPatternId, shiftDate, careHomeId } = req.query;
      const organizationId = req.currentOrganization?._id?.toString();

      if (!organizationId || !shiftPatternId || !shiftDate || !careHomeId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Missing required parameters: shiftPatternId, shiftDate, or careHomeId",
        });
        return;
      }

      const availableStaff = await this.staffSvc.getAvailableStaffForShift(
        organizationId,
        shiftPatternId as string,
        shiftDate as string,
        careHomeId as string
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: availableStaff.data,
        meta: {
          total: availableStaff.data.length,
          availableCount: availableStaff.data.filter(
            (staff) => staff.availability.isAvailable
          ).length,
        },
      });
    } catch (error: any) {
      Logger.error("Error getting available staff:", error);
      res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || StringValues.INTERNAL_SERVER_ERROR,
      });
    }
  };

  /**
   * Get staff availability for a date range
   * @route GET /api/v1/shifts/staff-availability
   */
  public getStaffAvailabilityForDateRange = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.currentOrganization?._id?.toString();

      if (!organizationId || !startDate || !endDate) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: "Missing required parameters: startDate or endDate",
        });
        return;
      }

      // Validate date format
      if (
        !dayjs(startDate as string).isValid() ||
        !dayjs(endDate as string).isValid()
      ) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: "Invalid date format. Please use YYYY-MM-DD format",
        });
        return;
      }

      // Validate date range
      if (dayjs(endDate as string).isBefore(dayjs(startDate as string))) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: "End date cannot be before start date",
        });
        return;
      }

      const availabilityMap =
        await this.staffSvc.getStaffAvailabilityForDateRange(
          organizationId,
          startDate as string,
          endDate as string
        );

      res.status(StatusCodes.OK).json({
        success: true,
        data: availabilityMap,
        meta: {
          dateRange: {
            startDate,
            endDate,
            totalDays:
              dayjs(endDate as string).diff(dayjs(startDate as string), "day") +
              1,
          },
        },
      });
    } catch (error: any) {
      Logger.error("Error getting staff availability:", error);
      res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || StringValues.INTERNAL_SERVER_ERROR,
      });
    }
  };

  public getCareStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const careStaff = await this.staffSvc.getCareStaff(
        organizationId,
        req.user._id.toString()
      );
      res.json(careStaff);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ message: "Error fetching care staff", error });
    }
  };

  public getAdminStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const adminStaff = await this.staffSvc.getAdminStaff(
        organizationId,
        req.user._id.toString()
      );
      res.json(adminStaff);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching admin staff", error });
    }
  };

  public getOtherStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const otherStaff = await this.staffSvc.getOtherStaff(organizationId);
      res.json(otherStaff);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching other staff", error });
    }
  };

  public getStaffByRole = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const { role } = req.params;
      const staff = await this.staffSvc.getStaffByRole(organizationId, role);
      res.json(staff);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching staff by role", error });
    }
  };
}

export default StaffController;
