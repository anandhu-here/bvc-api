import express from "express";
import { ParentCompanyController, UserController } from "./Controller";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import type { IRequest } from "src/interfaces/core/new";
import { Permission } from "src/configs/Permissions";
import JoinRequestController from "./JoinRequests";
import PasswordController from "../auth/PasswordController";
import UserService from "src/services/UserService";

const router = express.Router();

const userSvc = new UserService();
const userController = new UserController();
const joinRequestController = new JoinRequestController();
const parentCompanyController = new ParentCompanyController();
const passwordCtlr = new PasswordController(userSvc);

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/verify-email", userController.verifyEmail);
router.post(
  "/resend-verification-email",
  userController.resendVerificationEmail
);
router.route("/reset-password").post(userController.resetPassword);

router.route("/request-reset").post(userController.requestPasswordReset);

// Protected routes
router.use(AuthMiddleware.authenticateToken);

// User routes
router.get("/user/profile", userController.getProfile);

router.post(
  "/request-account-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ACCOUNT),
  userController.requestAccountDeletion
);

router.post(
  "/cancel-account-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ACCOUNT),
  userController.cancelAccountDeletion
);

// Parent Company routes
router.post(
  "/parentCompanies",
  AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
  parentCompanyController.createParentCompany
);
router.post(
  "/parentCompanies/addOrganization",
  AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
  parentCompanyController.addOrganizationToParentCompany
);
router.delete(
  "/parentCompanies/removeOrganization",
  AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
  parentCompanyController.removeOrganizationFromParentCompany
);

// router.get(
//   "carers",
//   AuthMiddleware.authorizePermission(Permission.VIEW_CARERS),
//   userController.getCarers
// );

// Join Request routes
router.post("/joinRequests", joinRequestController.createJoinRequest);
router.get("/joinRequests", joinRequestController.getJoinRequests);
export default router;
