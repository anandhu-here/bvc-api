import { Router } from "express";
import TimesheetController from "./TimesheetController";
import TimesheetMiddleWare from "src/middlewares/timesheet";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";

const TimesheetRouter: Router = Router();

const _timesheetController = new TimesheetController();

TimesheetRouter.use(AuthMiddleware.authenticateToken);

TimesheetRouter.route("/").get(_timesheetController.getTimesheets);

TimesheetRouter.route("/").post(_timesheetController.createTimesheet);
TimesheetRouter.route("/manual").get(
  _timesheetController.uploadManualTimesheet
);

TimesheetRouter.route("/:timesheetId/approve").patch(
  AuthMiddleware.authorizePermission(Permission.APPROVE_TIMESHEETS),
  _timesheetController.approveTimesheet
);

TimesheetRouter.route("/:timesheetId/reject").get(
  AuthMiddleware.authorizePermission("reject_timesheet"),
  _timesheetController.rejectTimesheet
);

TimesheetRouter.route("/scan-qr").post(_timesheetController.scanBarcode);
TimesheetRouter.route("/check-status").get(
  _timesheetController.checkTimesheetStatus
);

export default TimesheetRouter;
