import express from "express";
import ProfileController from "../auth/ProfileController";
import AnnualLeaveController from "./LeaveController";
import AuthMiddleware from "src/middlewares/Auth";

const LeaveRouter = express.Router();

const AnnualLeaveCtrl = new AnnualLeaveController();

/**
 * @name ProfileController.configureAnnualLeave
 * @description Configure annual leave for a staff type
 * @route POST /api/v1/auth/annual-leave/configure
 * @access private (admin, agency, or home users only)
 */
LeaveRouter.route("/annual-leave/configure").post(
  AuthMiddleware.isAuthenticatedUser,
  AnnualLeaveCtrl.configureAnnualLeave
);

/**
 * @name ProfileController.getAnnualLeaveConfig
 * @description Get annual leave configuration
 * @route GET /api/v1/auth/annual-leave/config
 * @access private
 */
LeaveRouter.route("/annual-leave/config").get(
  AuthMiddleware.isAuthenticatedUser,
  AnnualLeaveCtrl.getAnnualLeaveConfig
);

/**
 * @name ProfileController.requestAnnualLeave
 * @description Request annual leave
 * @route POST /api/v1/auth/annual-leave/request
 * @access private
 */
LeaveRouter.route("/annual-leave/request").post(
  AuthMiddleware.isAuthenticatedUser,
  AnnualLeaveCtrl.requestAnnualLeave
);

/**
 * @name ProfileController.getAnnualLeaveRequests
 * @description Get annual leave requests
 * @route GET /api/v1/auth/annual-leave/requests
 * @access private
 */
LeaveRouter.route("/annual-leave/requests/:staffId").get(
  AuthMiddleware.isAuthenticatedUser,
  AnnualLeaveCtrl.getAnnualLeaveRequests
);

/**
 * @name ProfileController.approveAnnualLeave
 * @description Approve an annual leave request
 * @route POST /api/v1/auth/annual-leave/approve/:leaveId
 * @access private (admin, agency, or home users only)
 */
LeaveRouter.route("/annual-leave/approve/:leaveId").post(
  AuthMiddleware.isAuthenticatedUser,
  AnnualLeaveCtrl.approveAnnualLeave
);

export default LeaveRouter;
