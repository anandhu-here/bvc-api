import EmailServices from "./EmailService";
import Logger from "../logger";
import crypto from "crypto";
import { Organization } from "src/models/new/Heirarchy";
import OrganizationInvitation from "src/models/Invites";
import OrganizationInvitations from "src/models/Invites";
import mongoose from "mongoose";
import { getOrgInvitationTemplate } from "src/modules/email/templates/getOrgInvite";

class InviteServices {
  private mailSvc: EmailServices;

  constructor() {
    this.mailSvc = new EmailServices();
  }

  private generateInvitationToken(email: string, orgId: string): string {
    const data = `${email}:${orgId}:${Date.now()}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  async createInvitation({
    organizationId,
    email,
    invitedBy,
    metadata = {},
  }: {
    organizationId: string;
    email: string;
    invitedBy: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      const token = this.generateInvitationToken(email, organizationId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

      const invitation = await OrganizationInvitations.create({
        organization: organizationId,
        email,
        token,
        invitedBy,
        expiresAt,
        metadata,
      });

      await this.sendInvitationEmail(invitation, organization);

      return invitation;
    } catch (error) {
      Logger.error("Error creating organization invitation:", error);
      throw error;
    }
  }

  private async sendInvitationEmail(invitation: any, organization: any) {
    const inviteLink = `${process.env.FRONTEND_URL}/join-organization?token=${invitation.token}`;
    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/wyecare-frontend.appspot.com/o/wyecare-logo-dark.png?alt=media&token=c83fb0b1-a841-4c22-a089-9185581eeef6";

    const emailHtml = getOrgInvitationTemplate(
      organization.name,
      inviteLink,
      logoUrl
    );

    await this.mailSvc.sendEmail({
      to: invitation.email,
      subject: `Invitation to join ${organization.name}`,
      html: emailHtml,
    });
  }

  async validateInvitationToken(token: string) {
    const invitation = await OrganizationInvitations.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("organization", "name");

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.validateInvitationToken(token);

    // Update invitation status
    invitation.status = "accepted";
    invitation.acceptedBy = new mongoose.Types.ObjectId(userId);
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Link organizations
    await Organization.findByIdAndUpdate(invitation.organization, {
      $addToSet: { linkedOrganizations: userId },
    });

    return invitation;
  }

  async getPendingInvitationsByEmail(email: string) {
    return await OrganizationInvitations.find({
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("organization", "name");
  }

  async getOrganizationInvitations(organizationId: string) {
    return await OrganizationInvitations.find({
      organization: organizationId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("invitedBy", "firstName lastName");
  }

  async revokeInvitation(invitationId: string) {
    return await OrganizationInvitations.findByIdAndUpdate(
      invitationId,
      { status: "expired" },
      { new: true }
    );
  }
}

export default InviteServices;