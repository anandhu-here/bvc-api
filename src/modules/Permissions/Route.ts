import express from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";
import PermissionRoleController from "./Controller";

const router = express.Router();

const permissionController = new PermissionRoleController();

// Protected routes
router.use(AuthMiddleware.authenticateToken);

// Permission routes
router.get(
  "/",
  AuthMiddleware.authorizePermission([Permission.GET_PERMISSIONS]),
  permissionController.getAllPermissions
);
router.patch(
  "/",
  AuthMiddleware.authorizePermission([Permission.ADD_PERMISSION]),
  permissionController.addPermissionsToUser
);

router.post(
  "/add",
  AuthMiddleware.authorizePermission([Permission.ADD_PERMISSION]),
  permissionController.addRoleToUser
);

router.post(
  "/remove",
  AuthMiddleware.authorizePermission([Permission.REMOVE_PERMISSION]),
  permissionController.removeRoleFromUser
);

export default router;
