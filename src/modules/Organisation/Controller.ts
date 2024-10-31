import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import Logger from "src/logger";
import AuthService from "src/services/new/AuthServices";
import JoinRequestServices from "src/services/new/JoinRequests";
import OrganizationServices from "src/services/OrgServices";
import { Types } from "mongoose";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";

class OrganizationController {
  private authService: AuthService;
  private orgSvc: OrganizationServices;
  private joinReqSvc: JoinRequestServices;
  constructor() {
    this.authService = new AuthService();
    this.orgSvc = new OrganizationServices();
    this.joinReqSvc = new JoinRequestServices();
  }

  public getOrganizationsListing = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizations = await this.orgSvc.getOrganizationListing();

      res.status(200).json({
        organizations,
      });
    } catch (error: any) {
      Logger.error("Get organizations error:", error);
      res.status(500).json({
        error: "An error occurred while fetching organizations",
      });
    }
  };

  public updateOrganizatonProfile = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;

      if (!organizationId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      await this.orgSvc.updateOrganization(organizationId.toString(), req.body);

      res.status(200).json({ message: "Organization profile updated" });
    } catch (error: any) {
      Logger.error("Update organization profile error:", error);
      res.status(500).json({
        error: "An error occurred while updating organization profile",
      });
    }
  };

  public createOrganization = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { name, type, address, phone, email, ownerId, countryCode } =
        req.body;

      if (!name || !type || !address || !phone || !email || !ownerId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const organization = await this.orgSvc.createOrganization({
        name,
        type,
        address,
        phone,
        email,
        admin: ownerId,
        countryCode,
      });

      await this.orgSvc.addUserToOrganization(
        ownerId,
        organization._id.toString(),
        "admin"
      );

      res.status(201).json({
        message: "Organization created successfully",
        organization: {
          id: organization._id,
          name: organization.name,
          type: organization.type,
        },
      });
    } catch (error: any) {
      Logger.error("Organization creation error:", error);
      res
        .status(500)
        .json({ error: "An error occurred during organization creation" });
    }
  };

  public getOrganizationRoleHeirarchy = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;

      const roleHeirarchy = await this.orgSvc.getOrganizationRoleHeirarchy(
        req.user?._id.toString(),
        organizationId
      );

      res.status(200).json(roleHeirarchy);
    } catch (error: any) {
      Logger.error("Get organization role heirarchy error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching role heirarchy" });
    }
  };

  public getOrganizationRole = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;
      const userId = req.user?._id;

      Logger.warn("POOR", organizationId, userId);

      const role = await this.orgSvc.getOrganizationRole(
        userId.toString(),
        organizationId
      );

      res.status(200).json(role);
    } catch (error: any) {
      Logger.error("Get organization roles error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching organization roles" });
    }
  };

  public addUserToOrganization = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId, organizationId, role } = req.body;

      if (!userId || !organizationId || !role) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const orgRole = await this.orgSvc.addUserToOrganization(
        userId,
        organizationId,
        role
      );

      await this.joinReqSvc.acceptJoinRequestForUser(userId, organizationId);

      res.status(200).json({
        message: "User added to organization successfully",
        orgRole,
      });
    } catch (error: any) {
      Logger.error("Add user to organization error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while adding user to organization" });
    }
  };

  public getOrganizationsByUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.params.userId;

      const organizations = await this.orgSvc.getOrganizationsByUser(userId);

      res.status(200).json({
        organizations,
      });
    } catch (error: any) {
      Logger.error("Get organizations by user error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching organizations" });
    }
  };

  public getOrganizationStaff = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;

      const staff = await this.orgSvc.getOrganizationStaff(organizationId);

      res.status(200).json({
        staff,
      });
    } catch (error: any) {
      Logger.error("Get organization staff error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching organization staff" });
    }
  };

  public updateUserRole = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId, organizationId, newRole } = req.body;

      if (!userId || !organizationId || !newRole) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const updatedRole = await this.orgSvc.updateUserRole(
        userId,
        organizationId,
        newRole
      );

      res.status(200).json({
        message: "User role updated successfully",
        updatedRole,
      });
    } catch (error: any) {
      Logger.error("Update user role error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while updating user role" });
    }
  };

  public removeUserFromOrganization = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId, organizationId } = req.body;

      if (!userId || !organizationId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.orgSvc.removeUserFromOrganization(userId, organizationId);

      res.status(200).json({
        message: "User removed from organization successfully",
      });
    } catch (error: any) {
      Logger.error("Remove user from organization error:", error);
      res.status(500).json({
        error: "An error occurred while removing user from organization",
      });
    }
  };

  public createLinkInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { fromOrganizationId, toOrganizationId } = req.body;

      if (!fromOrganizationId || !toOrganizationId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const invitation = await this.orgSvc.createLinkInvitation(
        fromOrganizationId,
        toOrganizationId
      );

      res.status(201).json({
        message: "Link invitation created successfully",
        invitation,
      });
    } catch (error: any) {
      Logger.error("Create link invitation error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while creating link invitation" });
    }
  };

  public getLinkInvitations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;

      if (!organizationId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const invitations = await this.orgSvc.getLinkInvitations(
        organizationId.toString()
      );

      res.status(200).json({
        invitations,
      });
    } catch (error: any) {
      Logger.error("Get link invitations error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching link invitations" });
    }
  };

  public respondToLinkInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { invitationId, accept } = req.body;

      if (!invitationId || accept === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.orgSvc.respondToLinkInvitation(invitationId, accept);

      res.status(200).json({
        message: accept
          ? "Link invitation accepted"
          : "Link invitation rejected",
      });
    } catch (error: any) {
      Logger.error("Respond to link invitation error:", error);
      res.status(500).json({
        error: "An error occurred while responding to link invitation",
      });
    }
  };

  public linkOrganizations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationId1, organizationId2 } = req.body;

      if (!organizationId1 || !organizationId2) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.orgSvc.linkOrganizations(organizationId1, organizationId2);

      res.status(200).json({
        message: "Organizations linked successfully",
      });
    } catch (error: any) {
      Logger.error("Link organizations error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while linking organizations" });
    }
  };

  public unlinkOrganizations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationId1, organizationId2 } = req.body;

      if (!organizationId1 || !organizationId2) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.orgSvc.unlinkOrganizations(organizationId1, organizationId2);

      res.status(200).json({
        message: "Organizations unlinked successfully",
      });
    } catch (error: any) {
      Logger.error("Unlink organizations error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while unlinking organizations" });
    }
  };

  public getLinkedOrganizationById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const user = req.user;
      const currentOrgId = req.currentOrganization?._id;

      if (user.role !== "admin") {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      const linkedOrganization = await this.orgSvc.getLinkedOrganizationById(
        organizationId,
        currentOrgId.toString()
      );

      res.status(200).json(linkedOrganization);
    } catch (error: any) {
      Logger.error("Get linked organization error:", error);
      res.status(500).json({
        error: "An error occurred while fetching linked organization",
      });
    }
  };

  public getLinkedOrganizations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const type = req.query.type as string | undefined;

      const { _id: organizationId } = req.currentOrganization;

      const linkedOrganizations = await this.orgSvc.getLinkedOrganizations(
        organizationId.toString(),
        type
      );

      res.status(200).json(linkedOrganizations);
    } catch (error: any) {
      Logger.error("Get linked organizations error:", error);
      res.status(500).json({
        error: "An error occurred while fetching linked organizations",
      });
    }
  };

  public getLinkedOrganizationAdminForCarer = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { _id: organizationId } = req.currentOrganization;

      const linkedOrganizationAdmin =
        await this.orgSvc.getLinkedOrganizationAdminForCarer(
          organizationId.toString(),
          new Types.ObjectId(req.user?._id.toString())
        );

      res.status(200).json(linkedOrganizationAdmin);
    } catch (error: any) {
      Logger.error("Get linked organization admin error:", error);
      res.status(500).json({
        error: "An error occurred while fetching linked organization admin",
      });
    }
  };

  public getLinkedOrganizationAdmin = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { _id: organizationId } = req.currentOrganization;

      const linkedOrganizationAdmin =
        await this.orgSvc.getLinkedOrganizationAdmins(
          organizationId.toString(),
          new Types.ObjectId(req.user?._id.toString())
        );

      res.status(200).json(linkedOrganizationAdmin);
    } catch (error: any) {
      Logger.error("Get linked organization admin error:", error);
      res.status(500).json({
        error: "An error occurred while fetching linked organization admin",
      });
    }
  };

  public searchOrganizations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { searchTerm, excludeType } = req.query;

      if (typeof searchTerm !== "string") {
        res.status(400).json({ error: "Search term must be a string" });
        return;
      }

      if (excludeType && typeof excludeType !== "string") {
        res.status(400).json({ error: "Exclude type must be a string" });
        return;
      }

      const organizations = await this.orgSvc.searchOrganizations(
        searchTerm,
        excludeType as string | undefined
      );

      res.status(200).json({
        organizations,
      });
    } catch (error: any) {
      Logger.error("Search organizations error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while searching organizations" });
    }
  };

  // Deletion
  public requestOrganizationDeletion = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id.toString();
      const userId = req.user?._id.toString();
      const { reason } = req.body;

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.authService.requestOrganizationDeletion(
        organizationId,
        userId,
        reason
      );

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error: any) {
      Logger.error("Request organization deletion error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public cancelOrganizationDeletion = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;
      const userId = req.user?._id.toString();

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.authService.cancelOrganizationDeletion(
        organizationId,
        userId
      );

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error: any) {
      Logger.error("Cancel organization deletion error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default OrganizationController;
