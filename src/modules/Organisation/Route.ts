import express from "express";

import AuthMiddleware from "src/middlewares/AuthMiddleware";
import type { IRequest } from "src/interfaces/core/new";
import { Permission } from "src/configs/Permissions";
import OrganizationController from "./Controller";
import InviteController from "./Invites";
const router = express.Router();

const organizationController = new OrganizationController();

const inviteController = new InviteController();

// Protected routes
router.use(AuthMiddleware.authenticateToken);

// Organization routes
router.post(
  "/",
  AuthMiddleware.authorizeCreateOrganization(Permission.CREATE_ORGANIZATION),
  organizationController.createOrganization
);

router.patch(
  "/",
  AuthMiddleware.authorizeCreateOrganization(Permission.CREATE_ORGANIZATION),
  organizationController.updateOrganizatonProfile
);

router.post(
  "/request-org-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ORGANIZATION),
  organizationController.requestOrganizationDeletion
);

router.get(
  "/cancel-org-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ORGANIZATION),
  organizationController.cancelOrganizationDeletion
);

router.get(
  "/roles/:organizationId",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getOrganizationRoleHeirarchy
);

router.post(
  "/:organizationId/request-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ORGANIZATION),
  organizationController.requestOrganizationDeletion
);

router.post(
  "/:organizationId/cancel-deletion",
  AuthMiddleware.authorizePermission(Permission.DELETE_ORGANIZATION),
  organizationController.cancelOrganizationDeletion
);

router.get("/listing", organizationController.getOrganizationsListing);

router.post(
  "/addUser",
  AuthMiddleware.authorizePermission(Permission.ADD_STAFF),
  organizationController.addUserToOrganization
);
router.get(
  "/user/:userId",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getOrganizationsByUser
);
router.get(
  "/:organizationId/staff",
  AuthMiddleware.authorizePermission(Permission.VIEW_STAFF),
  organizationController.getOrganizationStaff
);
router.get("/role/:organizationId", organizationController.getOrganizationRole);
router.put(
  "/updateUserRole",
  AuthMiddleware.authorizePermission(Permission.EDIT_STAFF_ROLE),
  organizationController.updateUserRole
);
router.delete(
  "/removeUser",
  AuthMiddleware.authorizePermission(Permission.REMOVE_STAFF),
  organizationController.removeUserFromOrganization
);
router.post(
  "/link",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  organizationController.linkOrganizations
);
router.post(
  "/unlink",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  organizationController.unlinkOrganizations
);
router.get(
  "/linked",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getLinkedOrganizations
);

router.get(
  "/linked/:organizationId",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getLinkedOrganizationById
);
router.get(
  "/linked/admins",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getLinkedOrganizationAdmin
);

router.get(
  "/linked/admins/carer",
  organizationController.getLinkedOrganizationAdminForCarer
);

router.post(
  "/linkInvitation",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  organizationController.createLinkInvitation
);

router.get(
  "/linkInvitations",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.getLinkInvitations
);

router.post(
  "/respondToLinkInvitation",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  organizationController.respondToLinkInvitation
);

router.get(
  "/search",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  organizationController.searchOrganizations
);
router.post(
  "/invitations/create",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  inviteController.createInvitation
);

router.get("/invitations/validate/:token", inviteController.validateToken);

router.post(
  "/invitations/accept/:token",
  AuthMiddleware.authenticateToken,
  inviteController.acceptInvitation
);

router.get(
  "/invitations/email/:email",
  AuthMiddleware.authenticateToken,
  inviteController.getPendingInvitationsByEmail
);

router.get(
  "/invitations/:organizationId",
  AuthMiddleware.authorizePermission(Permission.VIEW_ORGANIZATION),
  inviteController.getOrganizationInvitations
);

router.delete(
  "/invitations/:invitationId",
  AuthMiddleware.authorizePermission(Permission.LINK_ORGANIZATIONS),
  inviteController.revokeInvitation
);

// // Parent Company routes
// router.post(
//   "/parentCompanies",
//   AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
//   parentCompanyController.createParentCompany
// );
// router.post(
//   "/parentCompanies/addOrganization",
//   AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
//   parentCompanyController.addOrganizationToParentCompany
// );
// router.delete(
//   "/parentCompanies/removeOrganization",
//   AuthMiddleware.authorizePermission(Permission.MANAGE_PARENT_COMPANY),
//   parentCompanyController.removeOrganizationFromParentCompany
// );

// // Join Request routes
// router.post("/joinRequests", joinRequestController.createJoinRequest);
// router.get("/joinRequests", joinRequestController.getJoinRequests);
export default router;
