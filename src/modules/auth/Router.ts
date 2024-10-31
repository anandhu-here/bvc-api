/**
 * Define Auth Router
 */

import { Router } from "express";
import RegisterController from "./RegisterController";
import LoginController from "./LoginController";
import AuthMiddleware from "../../middlewares/Auth";
import UserService from "../../services/UserService";
import ProfileService from "../../services/ProfileService";
import ProfileController from "./ProfileController";
import PasswordController from "./PasswordController";
import ShiftService from "src/services/ShiftService";
import removeLinkedUserValidator from "src/validators/auth";
import PaymentMiddleware from "src/middlewares/Payment";
import PaymentController from "./PaymentController";
import PaymentService from "src/services/PaymentServices";

const AuthRouter: Router = Router();

const userSvc = new UserService();
const profileSvc = new ProfileService();
const shiftService = new ShiftService();
const paymentSvc = new PaymentService();
const registerCtlr = new RegisterController(userSvc, profileSvc, shiftService);
const loginCtlr = new LoginController(userSvc);
const profileCtlr = new ProfileController(profileSvc, userSvc);
const passwordCtlr = new PasswordController(userSvc);
const paymentCtlr = new PaymentController(userSvc, paymentSvc);

/**
 * @name RegisterController.sendRegisterOtp
 * @description Send OTP for registration.
 * @route POST /api/v1/auth/send-register-otp
 * @access public
 */
AuthRouter.route("/send-register-otp").all(registerCtlr.sendRegisterOtp);

/**
 * @name RegisterController.register
 * @description Create a new account.
 * @route POST /api/v1/auth/register
 * @access public
 */
AuthRouter.route("/register").all(registerCtlr.register);

/**
 * @name ProfileController.getCarer
 * @description Get carer details.
 * @route GET /api/v1/auth/carer
 * @access private
 */
AuthRouter.route("/:carerId/carer-resume").get(profileCtlr.getCarerResume);

AuthRouter.route("/unlink").patch(
  AuthMiddleware.isAuthenticatedUser,
  removeLinkedUserValidator,
  registerCtlr.removeLinkedUser
);

/**
 * @name RegisterController.linkUser
 * @description Link user.
 * @route PATCH /api/v1/auth/link
 * @access private
 */
AuthRouter.route("/link").patch(
  AuthMiddleware.isAuthenticatedUser,
  registerCtlr.linkUser
);

/**
 * @name LoginController.login
 * @description Create a new account.
 * @route POST /api/v1/auth/login
 * @access public
 */
AuthRouter.route("/login").all(loginCtlr.login);

/**
 * @name LoginController.checkUser
 * @description Check user.
 * @route POST /api/v1/auth/verify-token
 * @access public
 */
AuthRouter.route("/verify-token").all(loginCtlr.checkUser);

/**
 * @name ProfileController.getProfileDetails
 * @description Perform get profile detals.
 * @route GET /api/v1/auth/me
 * @access private
 */
AuthRouter.route("/me").all(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.getProfileDetails
);

AuthRouter.route("/linked-users/:accountType").get(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.getLinkedUsers
);

AuthRouter.route("/staffs").get(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.getStaffs
);

/**
 * @name PasswordController.sendResetPasswordOtp
 * @description Send OTP password reset.
 * @route POST /api/v1/auth/send-reset-password-otp
 * @access public
 */
AuthRouter.route("/send-reset-password-otp").all(
  passwordCtlr.sendResetPasswordOtp
);

/**
 * @name PasswordController.resetPassword
 * @description Reset the password.
 * @route POST /api/v1/auth/reset-password
 * @access public
 */
AuthRouter.route("/reset-password").post(passwordCtlr.resetPassword);

AuthRouter.route("/request-reset").post(passwordCtlr.requestPasswordReset);

AuthRouter.route("/update-availability").put(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.updateAvailabilities
);

AuthRouter.route("/availabilities/:date").delete(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.deleteAvailability
);

AuthRouter.route("/search-users/:accountType").get(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.searchUsers
);

AuthRouter.route("/users/:userType").get(profileCtlr.getUsers);

AuthRouter.route("/verify-email").post(profileCtlr.verifyEmail);

AuthRouter.route("/update-fcm-token").put(
  AuthMiddleware.isAuthenticatedUser,
  profileCtlr.updateFcmToken
);

AuthRouter.route("/create-subscription").post(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.createSubscription
);

AuthRouter.route("/initialize-customer").post(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.initializeCustomer
);

AuthRouter.route("/cancel-subscription").post(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.cancelSubscription
);

AuthRouter.route("/update-payment-method").post(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.updatePaymentMethod
);

AuthRouter.route("/payment-history").get(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.getPaymentHistory
);

AuthRouter.route("/subscription-status").get(
  AuthMiddleware.isAuthenticatedUser,
  paymentCtlr.getSubscriptionStatus
);

export default AuthRouter;
