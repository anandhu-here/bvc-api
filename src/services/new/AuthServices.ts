import {
  User,
  Organization,
  OrganizationRole,
  IUser,
  IOrganization,
  IOrganizationRole,
  type IParentCompany,
  ParentCompany,
} from "src/models/new/Heirarchy";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { RolePermissions } from "src/configs/Permissions";
import OrganizationServices from "../OrgServices";
import Logger from "src/logger";
import { DeletionRequest } from "src/models/Deletion";
import Invoice from "src/models/Invoice";
import ShiftModel from "src/models/Shift";
import CarerApplication from "src/models/CarerApplication";
import ShiftAssignmentModel from "src/models/ShiftAssignment";
import StripeService from "../StripeService";

class AuthService {
  private orgSvc: OrganizationServices;
  private stripeSvc: StripeService;
  constructor() {
    this.orgSvc = new OrganizationServices();
    this.stripeSvc = new StripeService();
  }
  public async verifyEmail(token: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ emailVerificationToken: token });

      if (!user) {
        return null;
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      return user;
    } catch (error) {
      Logger.error("Error in verifyEmail service:", error);
      throw error;
    }
  }
  async registerUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      const { email, password, ...otherData } = userData;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("Email already in use");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        ...otherData,
        email,
        password: hashedPassword,
      });

      await user.save();
      return user;
    } catch (error: any) {
      console.error("Error in registerUser:", error);
    }
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async generateToken(userId: string) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        Logger.error("JWT_SECRET is not defined in environment variables");
        throw new Error("JWT_SECRET is not defined");
      }
      Logger.info(`Generating token for user: ${userId}`);
      Logger.info(`JWT_SECRET length: ${secret.length}`);
      const token = jwt.sign({ userId }, secret, {
        expiresIn: "1d",
      });
      Logger.info(`Generated token length: ${token.length}`);
      return token;
    } catch (error) {
      Logger.error("Error in generateToken service:", error);
      throw error;
    }
  }

  async addStaffToOrganization(
    organizationId: string,
    userData: Partial<IUser>,
    role: string
  ): Promise<IUser> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await this.registerUser(userData);
    await this.orgSvc.addUserToOrganization(
      user._id.toString(),
      organizationId,
      role
    );

    return user;
  }

  async createParentCompany(
    companyData: Partial<IParentCompany>
  ): Promise<IParentCompany> {
    const parentCompany = new ParentCompany(companyData);
    await parentCompany.save();
    return parentCompany;
  }

  async addOrganizationToParentCompany(
    organizationId: string,
    parentCompanyId: string
  ): Promise<void> {
    const organization = await Organization.findById(organizationId);
    const parentCompany = await ParentCompany.findById(parentCompanyId);

    if (!organization || !parentCompany) {
      throw new Error("Organization or Parent Company not found");
    }

    organization.parentCompany = parentCompany._id as Types.ObjectId;
    await organization.save();

    parentCompany.organizations.push(organization._id as Types.ObjectId);
    await parentCompany.save();
  }

  async removeOrganizationFromParentCompany(
    organizationId: string,
    parentCompanyId: string
  ): Promise<void> {
    const organization = await Organization.findById(organizationId);
    const parentCompany = await ParentCompany.findById(parentCompanyId);

    if (!organization || !parentCompany) {
      throw new Error("Organization or Parent Company not found");
    }

    organization.parentCompany = undefined;
    await organization.save();

    parentCompany.organizations = parentCompany.organizations.filter(
      (id) => !id.equals(organization._id as Types.ObjectId)
    );
    await parentCompany.save();
  }

  public generateEmailVerificationToken = async (
    email: string
  ): Promise<string | null> => {
    try {
      const user = await User.findOne({
        email,
        emailVerified: false,
      });

      if (!user) return null;

      const token = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      return token;
    } catch (error: any) {
      Logger.error(
        "UserService: generateEmailVerificationToken",
        "errorInfo:" + JSON.stringify(error)
      );
      return null;
    }
  };

  public validateEmailVerificationToken = async (
    token: string
  ): Promise<IUser | null> => {
    return User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });
  };

  // reset passeword
  public generatePasswordResetCode = async (
    email: string
  ): Promise<string | null> => {
    try {
      const user = await User.findOne({ email });
      if (!user) return null;

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.passwordResetCode = resetCode;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

      await user.save();
      return resetCode;
    } catch (error: any) {
      Logger.error(
        "UserService: generatePasswordResetCode",
        "errorInfo:" + JSON.stringify(error)
      );
      return null;
    }
  };

  public validatePasswordResetCode = async (
    email: string,
    code: string
  ): Promise<IUser | null> => {
    return User.findOne({
      email,
      passwordResetCode: code,
      passwordResetExpires: { $gt: Date.now() },
    });
  };

  public resetPassword = async (
    userId: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password
      user.password = hashedPassword;
      user.passwordResetCode = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return true;
    } catch (error: any) {
      Logger.error(
        "UserService: resetPassword",
        "errorInfo:" + JSON.stringify(error)
      );
      return false;
    }
  };

  // deletion
  public async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Check if user is an admin in any organization
      const adminRoles = await OrganizationRole.findOne({
        user: userId,
        role: "admin",
      });

      // if(adminRoles.role === 'admin'){
      //   return {
      //     success: false,
      //     message: "User is an admin in an organization. Request to delete the organization instead.",
      //   };
      // }

      // Create a deletion request
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30); // Schedule deletion after 30 days

      const deletionRequest = new DeletionRequest({
        entityType: "user",
        entityId: userId,
        requestedBy: userId,
        scheduledDeletionDate: deletionDate,
        reason: reason,
      });

      await deletionRequest.save();

      // Update user status
      user.accountDeletionRequested = true;
      user.accountDeletionRequestedAt = new Date();
      await user.save();

      return {
        success: true,
        message:
          "Account deletion request submitted successfully. Your account will be deleted after 7 days.",
      };
    } catch (error: any) {
      Logger.error("Error in requestAccountDeletion service:", error);
      return {
        success: false,
        message:
          "An error occurred while submitting the account deletion request",
      };
    }
  }

  public async requestOrganizationDeletion(
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return { success: false, message: "Organization not found" };
      }

      // Check if the user is an admin of the organization
      const isAdmin = await OrganizationRole.exists({
        organization: organizationId,
        user: userId,
        role: "admin",
      });

      if (!isAdmin) {
        return {
          success: false,
          message: "Only admins can request organization deletion",
        };
      }

      // Create a deletion request
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30); // Schedule deletion after 30 days

      const deletionRequest = new DeletionRequest({
        entityType: "organization",
        entityId: organizationId,
        requestedBy: userId,
        scheduledDeletionDate: deletionDate,
        reason: reason,
      });

      await deletionRequest.save();

      return {
        success: true,
        message:
          "Organization deletion request submitted successfully. The organization will be deleted after 30 days.",
      };
    } catch (error: any) {
      Logger.error("Error in requestOrganizationDeletion service:", error);
      return {
        success: false,
        message:
          "An error occurred while submitting the organization deletion request",
      };
    }
  }

  public async executeDeletionRequests(): Promise<void> {
    try {
      const pendingDeletions = await DeletionRequest.find({
        status: "pending",
        scheduledDeletionDate: { $lte: new Date() },
      });

      for (const request of pendingDeletions) {
        if (request.entityType === "user") {
          await this.executeUserDeletion(request.entityId);
        } else if (request.entityType === "organization") {
          await this.executeOrganizationDeletion(request.entityId);
        }

        request.status = "completed";
        await request.save();
      }
    } catch (error: any) {
      Logger.error("Error in executeDeletionRequests service:", error);
    }
  }

  private async executeUserDeletion(userId: Types.ObjectId): Promise<void> {
    // Remove user from all organizations
    await OrganizationRole.deleteMany({ user: userId });

    // Remove user from all organization staff arrays
    await Organization.updateMany(
      { staff: userId },
      { $pull: { staff: userId } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    await Promise.all([
      CarerApplication.deleteMany({ userId }),
      ShiftAssignmentModel.deleteMany({
        user: userId,
      }),
      // Add any other models that have a userId field
    ]);
  }

  private async executeOrganizationDeletion(
    organizationId: Types.ObjectId
  ): Promise<void> {
    // Delete all organization roles
    await OrganizationRole.deleteMany({ organization: organizationId });

    // Delete all related data
    await Promise.all([
      Invoice.deleteMany({ orgId: organizationId }),
      ShiftModel.deleteMany({ orgId: organizationId }),
      // Resident.deleteMany({ orgId: organizationId }),
      this.stripeSvc.cancelSubscription(organizationId.toString()),
      // Add any other models that have an orgId field
    ]);

    // Delete the organization
    await Organization.findByIdAndDelete(organizationId);
  }

  public async cancelAccountDeletion(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const deletionRequest = await DeletionRequest.findOne({
        entityType: "user",
        entityId: userId,
        status: "pending",
      });

      if (!deletionRequest) {
        return {
          success: false,
          message: "No pending deletion request found for this account",
        };
      }

      deletionRequest.status = "cancelled";
      await deletionRequest.save();

      user.accountDeletionRequested = false;
      user.accountDeletionRequestedAt = undefined;
      await user.save();

      return {
        success: true,
        message: "Account deletion request has been cancelled successfully",
      };
    } catch (error: any) {
      Logger.error("Error in cancelAccountDeletion service:", error);
      return {
        success: false,
        message:
          "An error occurred while cancelling the account deletion request",
      };
    }
  }

  public async cancelOrganizationDeletion(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return { success: false, message: "Organization not found" };
      }

      // Check if the user is an admin of the organization
      const isAdmin = await OrganizationRole.exists({
        organization: organizationId,
        user: userId,
        role: "admin",
      });

      if (!isAdmin) {
        return {
          success: false,
          message: "Only admins can cancel organization deletion requests",
        };
      }

      const deletionRequest = await DeletionRequest.findOne({
        entityType: "organization",
        entityId: organizationId,
        status: "pending",
      });

      if (!deletionRequest) {
        return {
          success: false,
          message: "No pending deletion request found for this organization",
        };
      }

      deletionRequest.status = "cancelled";
      await deletionRequest.save();

      return {
        success: true,
        message:
          "Organization deletion request has been cancelled successfully",
      };
    } catch (error: any) {
      Logger.error("Error in cancelOrganizationDeletion service:", error);
      return {
        success: false,
        message:
          "An error occurred while cancelling the organization deletion request",
      };
    }
  }
}

export default AuthService;
