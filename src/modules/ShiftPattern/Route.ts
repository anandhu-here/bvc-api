import { Router } from "express";
import ShiftTypeController from "./ShiftPatternController";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";

const router = Router();
const shiftTypeController = new ShiftTypeController();

router.use(AuthMiddleware.authenticateToken);

router.post(
  "/",
  AuthMiddleware.authorizePermission(Permission.CREATE_SHIFT_PATTERN),
  shiftTypeController.createYourShiftPattern
);
router.get("/", shiftTypeController.getYourShiftPattern);

router.get("/other/:userId", shiftTypeController.getOtherShiftpattern);

router.put("/:shiftTypeId", shiftTypeController.updateYourShiftPattern);

router.delete("/:shiftTypeId", shiftTypeController.deleteYourShiftPattern);

router.get("/home/:userId", shiftTypeController.getShiftTypes);
router.get("/agency/:userId", shiftTypeController.getShiftTypes);

router.put("/home/:userId/:shiftTypeId", shiftTypeController.updateShiftType);
router.put("/agency/:userId/:shiftTypeId", shiftTypeController.updateShiftType);

router.delete(
  "/home/:userId/:shiftTypeId",
  shiftTypeController.deleteShiftType
);
router.delete(
  "/agency/:userId/:shiftTypeId",
  shiftTypeController.deleteShiftType
);

export default router;
