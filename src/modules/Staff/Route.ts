import { Router } from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";
import StaffController from "./Controller";

const StaffRouter: Router = Router();
const staffController = new StaffController();

StaffRouter.use(AuthMiddleware.authenticateToken);

/**
 * @name StaffController.getAllStaff
 * @description Get all staff in an organization.
 * @route GET /api/v1/staff
 * @access private
 */
StaffRouter.route("/").get(
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getAllStaff
);

StaffRouter.route("/:staffId").delete(
  AuthMiddleware.authorizePermission(Permission.REMOVE_STAFF),
  staffController.removeStaff
);

/**
 * @name StaffController.getCareStaff
 * @description Get all care staff in an organization.
 * @route GET /api/v1/staff/care
 * @access private
 */
StaffRouter.route("/care").get(
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getCareStaff
);

/**
 * @name StaffController.getAdminStaff
 * @description Get all admin staff in an organization.
 * @route GET /api/v1/staff/admin
 * @access private
 */
StaffRouter.route("/admin").get(
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getAdminStaff
);

/**
 * @name StaffController.getOtherStaff
 * @description Get all other staff in an organization.
 * @route GET /api/v1/staff/other
 * @access private
 */
StaffRouter.route("/other").get(
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getOtherStaff
);

/**
 * @name StaffController.getStaffByRole
 * @description Get staff by role in an organization.
 * @route GET /api/v1/staff/role/:role
 * @access private
 */
StaffRouter.route("/role/:role").get(
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getStaffByRole
);

/**
 * @route GET /api/v1/shifts/available-staff
 * @desc Get available staff for a specific shift
 * @access Private
 */
StaffRouter.get(
  "/available-staff",
  AuthMiddleware.authenticateToken,
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getAvailableStaffForShift
);

/**
 * @route GET /api/v1/shifts/staff-availability
 * @desc Get staff availability for a date range
 * @access Private
 */
StaffRouter.get(
  "/staff-availability",
  AuthMiddleware.authenticateToken,
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  staffController.getStaffAvailabilityForDateRange
);

export default StaffRouter;
