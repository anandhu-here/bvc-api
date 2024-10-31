import { Router } from "express";
import AuthMiddleware from "src/middlewares/Auth";
import Invitation from "./invitationController";
import InvitationService from "src/services/InvitationService";
import UserService from "src/services/UserService";
import InvitationMidleWare from "src/middlewares/invitation";
import HomeStaffInvitation from "./homeStaffInvitationController";
import HomeStaffInvitationService from "src/services/homeStaffInvitationService";
import InvitationController from "./invController";
import InvService from "src/services/invService";
import PaymentMiddleware from "src/middlewares/Payment";

const InvitationRouter: Router = Router();
const _invSvc = new InvitationService();
const _invitationService = new InvService();
const _homeStaffInvSvc = new HomeStaffInvitationService();
const _userSvc = new UserService();
const _invController = new Invitation(_invSvc, _userSvc);
const _invitationController = new InvitationController(
  _invitationService,
  _userSvc
);
const _homeStaffInvController = new HomeStaffInvitation(
  _homeStaffInvSvc,
  _userSvc
);

// InvitationRouter.route("/").post(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.sendInvitation
// )
// InvitationRouter.route("/").get(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.getInvitations
// )
// InvitationRouter.route('/token/:invToken').get(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.getInvitation
// )
// InvitationRouter.route("/accept/:invitationId").put(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.acceptInvitation
// )
// InvitationRouter.route("/reject/:invitationId").put(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.rejectInvitation
// )
// InvitationRouter.route("/:invitationId").delete(
//     AuthMiddleware.isAuthenticatedUser,
//     _invController.cancelInvitation
// )

// Home Staff Invitation routes
InvitationRouter.route("/home-staff").post(
  AuthMiddleware.isAuthenticatedUser,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  PaymentMiddleware.requireActiveSubscription,
  _homeStaffInvController.sendInvitation
);

InvitationRouter.route("/home-staff").get(
  AuthMiddleware.isAuthenticatedUser,
  _homeStaffInvController.getInvitations
);

InvitationRouter.route("/home-staff/token/:token").get(
  _homeStaffInvController.getInvitationByToken
);

InvitationRouter.route("/home-staff/:invitationId").put(
  AuthMiddleware.isAuthenticatedUser,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  PaymentMiddleware.requireActiveSubscription,
  _homeStaffInvController.updateInvitationStatus
);

// General Invitation routes
InvitationRouter.route("/")
  .post(
    AuthMiddleware.isAuthenticatedUser,
    PaymentMiddleware.checkAndSetSubscriptionStatus,
    PaymentMiddleware.requireActiveSubscription,
    _invitationController.sendInvitation
  )
  .get(
    AuthMiddleware.isAuthenticatedUser,
    _invitationController.getInvitations
  );

InvitationRouter.route("/token/:token").get(
  AuthMiddleware.isAuthenticatedUser,
  _invitationController.getInvitationByToken
);

InvitationRouter.route("/accept/:invitationId").put(
  AuthMiddleware.isAuthenticatedUser,
  _invitationController.acceptInvitation
);

InvitationRouter.route("/:invitationId")
  .put(
    AuthMiddleware.isAuthenticatedUser,
    _invitationController.updateInvitationStatus
  )
  .delete(
    AuthMiddleware.isAuthenticatedUser,
    _invitationController.deleteInvitation
  );
// InvitationRouter.route("/home-staff/:invitationId").delete(
//     AuthMiddleware.isAuthenticatedUser,
//     _homeStaffInvController.deleteInvitation
// );

export default InvitationRouter;
