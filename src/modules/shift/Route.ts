import { Router } from "express";
import ShiftController from "./shiftController";
import PaymentMiddleware from "src/middlewares/Payment";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";

const ShiftRouter: Router = Router();
const _shiftController = new ShiftController();

ShiftRouter.use(AuthMiddleware.authenticateToken);

/**
 * @name ShiftController.getShifts
 * @description Get all shifts.
 * @route GET /api/v1/shifts
 * @access private
 */
ShiftRouter.route("/").get(_shiftController.getShifts);
ShiftRouter.route("/single/:shiftId").get(_shiftController.getSingleShift);

/**
 * @name ShiftController.getUnAcceptedShifts
 * @description Get all unaccepted shifts.
 * @route GET /api/v1/shifts/unaccepted
 * @access private
 * @returns {IShift[]}
 * @throws {Error}
 */
ShiftRouter.route("/unaccepted").get(_shiftController.getUnAcceptedShifts);

ShiftRouter.route("/published").get(_shiftController.getPubShifts);
ShiftRouter.route("/published/free").get(
  _shiftController.getUpcomingUnassignedShifts
);
ShiftRouter.route("/published/agency").get(_shiftController.getAgencyShifts);

/**
 * @name ShiftController.getShiftWithAssignments
 * @description Get a shift by ID with its assignments.
 * @route GET /api/v1/shifts/:shiftId
 * @access private
 */
ShiftRouter.route("/:shiftId").get(_shiftController.getShiftWithAssignments);

/**
 * @name ShiftController.createShift
 * @description Create a new shift.
 * @route POST /api/v1/shifts
 * @access private
 */
ShiftRouter.route("/").post(_shiftController.createShift);

/**
 * @name ShiftController.createMultipleShifts
 * @description Create multiple shifts.
 * @route POST /api/v1/shifts/multiple
 */
ShiftRouter.route("/multiple").post(
  _shiftController.createAndAssignMultipleShifts
);

ShiftRouter.route("/multiple/free").post(
  AuthMiddleware.authorizePermission(Permission.CREATE_SHIFT),
  _shiftController.createMultipleShifts
);

/**
 * @name ShiftController.deleteShift
 * @description Delete a shift.
 * @route DELETE /api/v1/shifts/:shiftId
 * @access private
 */
ShiftRouter.route("/:shiftId").delete(_shiftController.deleteShift);

/**
 * @name ShiftController.updateShift
 * @description Update a shift.
 * @route PUT /api/v1/shifts/:shiftId
 * @access private
 */
ShiftRouter.route("/:shiftId").put(_shiftController.updateShift);

/**
 * @name ShiftController.assignUsersToShift
 * @description Assign users to a shift.
 * @route POST /api/v1/shifts/:shiftId/assign
 * @access private
 */
ShiftRouter.route("/:shiftId/assign").post(
  _shiftController.assignUsersToShifts
);

ShiftRouter.route("/:shiftId/assigned").get(
  _shiftController.getAssignmentsForShift
);

ShiftRouter.route("/utils/quickstats").get(_shiftController.getQuickStats);

/**
 * @name ShiftController.unassignUserFromShift
 * @description Unassign a user from a shift.
 * @route DELETE /api/v1/shifts/:shiftId/unassign/:userId
 * @access private
 */
ShiftRouter.route("/:shiftId/unassign/:userId").delete(
  _shiftController.unassignUserFromShift
);

/**
 * @name ShiftController.updateAssignmentStatus
 * @description Update the status of a shift assignment.
 * @route PUT /api/v1/shifts/assignments/:assignmentId
 * @access private
 */
ShiftRouter.route("/assignments/:assignmentId").put(
  _shiftController.updateAssignmentStatus
);

/**
 * @name ShiftController.getAssignmentsForUser
 * @description Get all assignments for the current user.
 * @route GET /api/v1/shifts/assignments/user
 * @access private
 */
ShiftRouter.route("/assignments/user").get(
  _shiftController.getAssignmentsForUser
);

/**
 * @name ShiftController.generateQRCode
 * @description Generate QR code for a shift.
 * @route POST /api/v1/shifts/:shiftId/generateQR
 * @access private
 */
ShiftRouter.route("/:shiftId/generateQR").post(_shiftController.generateQRCode);

/**
 * @name ShiftController.getUnacceptedShiftsForAgency
 * @description Get all unaccepted shifts for the agency.
 * @route GET /api/v1/shifts/agency/unaccepted
 * @access private
 */
ShiftRouter.route("/agency/unaccepted").get(
  _shiftController.getUnacceptedShiftsForAgency
);

/**
 * @name ShiftController.acceptShiftByAgency
 * @description Accept a shift by the agency.
 * @route POST /api/v1/shifts/agency/accept/:shiftId
 * @access private
 */
ShiftRouter.route("/agency/accept/:shiftId").post(
  _shiftController.acceptShiftByAgency
);

ShiftRouter.route("/generate-qr").post(_shiftController.generateBarcode);

export default ShiftRouter;
