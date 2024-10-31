import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
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
