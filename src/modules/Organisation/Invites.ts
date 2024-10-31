// controllers/InviteController.ts
import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import InviteServices from "src/services/InviteServices";
import { validateEmail } from "./utils/invite";
import Logger from "src/logger";

class InviteController {
  private inviteService: InviteServices;

  constructor() {
    this.inviteService = new InviteServices();
    this.createInvitation = this.createInvitation.bind(this);
    this.validateToken = this.validateToken.bind(this);
    this.acceptInvitation = this.acceptInvitation.bind(this);
    this.getPendingInvitationsByEmail =
      this.getPendingInvitationsByEmail.bind(this);
    this.getOrganizationInvitations =
      this.getOrganizationInvitations.bind(this);
    this.revokeInvitation = this.revokeInvitation.bind(this);
  }

  /**
   * Create a new organization invitation
   */
  async createInvitation(req: Request, res: Response) {
    try {
      const { organizationId, email, metadata } = req.body;
      const invitedBy = req.user?._id; // Assuming you have user info in request

      // Validate required fields
      if (!organizationId || !email) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and email are required",
        });
      }

      // Validate email format
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const invitation = await this.inviteService.createInvitation({
        organizationId,
        email,
        invitedBy: invitedBy.toString(),
        metadata,
      });

      res.status(201).json({
        success: true,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("Error in createInvitation controller:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error creating invitation",
      });
    }
  }

  /**
   * Validate an invitation token
   */
  async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      const invitation = await this.inviteService.validateInvitationToken(
        token
      );

      res.json({
        success: true,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("Error in validateToken controller:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Invalid token",
      });
    }
  }

  /**
   * Accept an organization invitation
   */
  async acceptInvitation(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const userId = req.user?._id; // Assuming you have user info in request

      if (!token || !userId) {
        return res.status(400).json({
          success: false,
          message: "Token and user ID are required",
        });
      }

      const invitation = await this.inviteService.acceptInvitation(
        token,
        userId.toString()
      );

      res.json({
        success: true,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("Error in acceptInvitation controller:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Error accepting invitation",
      });
    }
  }

  /**
   * Get pending invitations for an email
   */
  async getPendingInvitationsByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const invitations = await this.inviteService.getPendingInvitationsByEmail(
        email
      );

      res.json({
        success: true,
        data: invitations,
      });
    } catch (error: any) {
      Logger.error("Error in getPendingInvitationsByEmail controller:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching invitations",
      });
    }
  }

  /**
   * Get all invitations for an organization
   */
  async getOrganizationInvitations(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const invitations = await this.inviteService.getOrganizationInvitations(
        organizationId
      );

      res.json({
        success: true,
        data: invitations,
      });
    } catch (error: any) {
      Logger.error("Error in getOrganizationInvitations controller:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching organization invitations",
      });
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(req: Request, res: Response) {
    try {
      const { invitationId } = req.params;

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          message: "Invitation ID is required",
        });
      }

      const invitation = await this.inviteService.revokeInvitation(
        invitationId
      );

      res.json({
        success: true,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("Error in revokeInvitation controller:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error revoking invitation",
      });
    }
  }
}

export default InviteController;
