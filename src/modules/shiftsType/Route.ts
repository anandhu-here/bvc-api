/**
 * Define ShiftType Router
 */

import { Router } from "express";
import AuthMiddleware from "../../middlewares/Auth";
import ShiftTypeController from "./ShiftTypeConrtoller";
import ShiftTypeService from "../../services/ShiftTypeService";

const ShiftTypeRouter: Router = Router();

const shiftTypeSvc = new ShiftTypeService();
const shiftTypeCtlr = new ShiftTypeController(shiftTypeSvc);

/**
 * @name ShiftTypeController.createShiftType
 * @description Create a new shift type.
 * @route POST /api/v1/shift-types
 * @access private
 */
ShiftTypeRouter.route("/init").post(
  AuthMiddleware.isAuthenticatedUser,
  shiftTypeCtlr.createUserShiftsTypes
);

ShiftTypeRouter.route("/:shiftTypeId/one").delete(
  AuthMiddleware.isAuthenticatedUser,
  shiftTypeCtlr.deleteShiftType
);

ShiftTypeRouter.route("/:userId").delete(
  AuthMiddleware.isAuthenticatedUser,
  shiftTypeCtlr.deleteUserShift
);
ShiftTypeRouter.route("/:shiftTypeId").put(
  AuthMiddleware.isAuthenticatedUser,
  shiftTypeCtlr.editShiftType
);

/**
 * @name ShiftTypeController.getShiftTypes
 * @description Get all shift types.
 * @route GET /api/v1/shift-types
 * @access private
 */
ShiftTypeRouter.route("/:userId").get(
  AuthMiddleware.isAuthenticatedUser,
  shiftTypeCtlr.getUserShiftTypes
);

/**
 * @name ShiftTypeController.getShiftTypeById
 * @description Get a shift type by ID.
 * @route GET /api/v1/shift-types/:id
 * @access private
 */
// ShiftTypeRouter.route("/:id").get(
//   AuthMiddleware.isAuthenticatedUser,
//   shiftTypeCtlr.getShiftTypeById
// );

/**
 * @name ShiftTypeController.updateShiftType
 * @description Update a shift type.
 * @route PUT /api/v1/shift-types/:id
 * @access private
 */
// ShiftTypeRouter.route("/:id").put(
//   AuthMiddleware.isAuthenticatedUser,
//   shiftTypeCtlr.updateShiftType
// );

/**
 * @name ShiftTypeController.deleteShiftType
 * @description Delete a shift type.
 * @route DELETE /api/v1/shift-types/:id
 * @access private
 */
// ShiftTypeRouter.route("/:id").delete(
//   AuthMiddleware.isAuthenticatedUser,
//   shiftTypeCtlr.deleteShiftType
// );

export default ShiftTypeRouter;
