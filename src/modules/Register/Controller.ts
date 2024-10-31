import { Request, Response } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import Logger from "src/logger";
import type { IParentCompany } from "src/models/new/Heirarchy";
import AuthService from "src/services/new/AuthServices";
import JoinRequestServices from "src/services/new/JoinRequests";
import OrganizationServices from "src/services/OrgServices";
import { generateVerificationToken } from "src/utils/email-token";
import Validators from "src/utils/validator";
import { getEmailVerificationTemplate } from "../email/templates/verify-email";
import EmailServices from "src/services/EmailService";
import { getPasswordResetTemplate } from "../email/templates/reset-pass";
import { FCMToken } from "src/models/new/FCM";
class UserController {
  private authService: AuthService;
  private joinRequestService: JoinRequestServices;
  private orgSvc: OrganizationServices;
  private emailSvc: EmailServices;

  constructor() {
    this.authService = new AuthService();
    this.joinRequestService = new JoinRequestServices();
    this.orgSvc = new OrganizationServices();
    this.emailSvc = new EmailServices();
  }
  public getProfile = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const identifier = req.query.identifier;
      const fcmTokens = await FCMToken.find({
        user: user?._id.toString(),
        "device.identifier": identifier,
      }).lean();
      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }
      res.status(200).json({
        user: req.user,
        notificationEnabled: fcmTokens.length > 0,
        organization: req.organization,
        organizationRoles: req.organizationRoles,
        pendingJoinRequest: req.pendingJoinRequest,
        currentOrganization: req.currentOrganization,
        staffType: req.staffType,
      });
    } catch (error: any) {
      Logger.error("Get profile error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching profile" });
    }
  };

  // USER DELETION

  public requestAccountDeletion = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.user?._id.toString();
      const { reason } = req.body;

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.authService.requestAccountDeletion(
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
      Logger.error("Request account deletion error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public cancelAccountDeletion = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.user?._id.toString();

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.authService.cancelAccountDeletion(userId);

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
      Logger.error("Cancel account deletion error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public requestPasswordReset = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: StringValues.EMAIL_REQUIRED,
      });
      return;
    }

    const resetCode = await this.authService.generatePasswordResetCode(email);
    if (!resetCode) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: StringValues.USER_NOT_FOUND,
      });
      return;
    }

    const user = await this.authService.findUserByEmail(email);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: StringValues.USER_NOT_FOUND,
      });
      return;
    }

    // TODO: Create a proper email template for password reset
    const emailTemplate = getPasswordResetTemplate(resetCode, user.firstName);

    try {
      await this.emailSvc.sendEmail({
        to: email,
        subject: "Password Reset Code",
        html: emailTemplate,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Password reset code sent successfully",
      });
    } catch (error: any) {
      Logger.error("Failed to send password reset email", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: StringValues.EMAIL_SEND_ERROR,
      });
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: StringValues.INVALID_REQUEST,
      });
      return;
    }

    const user = await this.authService.validatePasswordResetCode(email, code);
    if (!user) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid reset code",
      });
      return;
    }

    const resetSuccess = await this.authService.resetPassword(
      user._id.toString(),
      newPassword
    );
    if (resetSuccess) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.PASSWORD_RESET_SUCCESS,
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: StringValues.PASSWORD_RESET_FAILED,
      });
    }
  };

  public resendVerificationEmail = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: StringValues.EMAIL_REQUIRED,
        });
        return;
      }

      const user = await this.authService.findUserByEmail(email);

      if (!user) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: StringValues.USER_NOT_FOUND,
        });
        return;
      }

      if (user.emailVerified) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Email is already verified",
        });
        return;
      }

      const newEmailToken =
        await this.authService.generateEmailVerificationToken(email);

      if (!newEmailToken) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to generate verification token",
        });
        return;
      }

      console.log(newEmailToken, "newEmailToken");

      const emailTemplate = getEmailVerificationTemplate(
        newEmailToken,
        user.firstName
      );

      try {
        await this.emailSvc.sendEmail({
          to: user.email,
          subject: "Verify Your Email",
          html: emailTemplate,
        });
        Logger.info("Verification email resent to user", user.email);

        res.status(StatusCodes.OK).json({
          success: true,
          message: "Verification email resent successfully",
        });
      } catch (error: any) {
        Logger.error("Failed to resend verification email", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to resend verification email",
        });
      }
    } catch (error: any) {
      Logger.error("Resend verification email error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Verification token is required",
        });
        return;
      }

      const user = await this.authService.validateEmailVerificationToken(token);
      user.emailVerified = true;
      user.emailVerificationToken = undefined;

      await user.save();

      if (!user) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid verification token",
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        user: user,
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: any) {
      Logger.error("Email verification error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        role,
        phone,
        address,
        countryCode,
        company,
      } = req.body;

      // Validate required fields
      if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        !role ||
        !phone ||
        !countryCode
      ) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: StringValues.MISSING_REQUIRED_FIELDS });
        return;
      }

      // Validate email format
      if (!Validators.validateEmail(email)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: StringValues.INVALID_EMAIL_FORMAT });
        return;
      }

      // Validate password
      if (password.length < 8 || password.length > 32) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: StringValues.INVALID_PASSWORD_LENGTH });
        return;
      }

      const _email = email.toLowerCase().trim();

      const existingUser = await this.authService.findUserByEmail(_email);
      if (existingUser) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: StringValues.EMAIL_ALREADY_REGISTERED,
          isEmailUsed: true,
        });
        return;
      }

      const user = await this.authService.registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: _email,
        password,
        role,
        countryCode,
        phone: phone.trim(),
        address,
        emailVerified: false,
      });

      const emailToken = await this.authService.generateEmailVerificationToken(
        _email
      );

      console.log(emailToken, "emailToken");

      user.emailVerificationToken = emailToken;
      user.save();

      console.log(user, "user");

      const token = this.authService.generateToken(user._id.toString());

      console.log(token, "...");
      const roles = await this.orgSvc.getUserHighestAndLowestRoles(
        user._id.toString()
      );
      const { highest, lowest } = roles;
      console.log(roles, "roles");

      const joinRequests =
        await this.joinRequestService.getLatestJoinRequestForUser(
          user._id.toString()
        );

      console.log(joinRequests, "joinRequests");
      // Send verification email
      const emailTemplate = getEmailVerificationTemplate(
        emailToken,
        user.firstName
      );

      console.log(emailTemplate, "emailTemplate");

      try {
        await this.emailSvc.sendEmail({
          to: user.email,
          subject: "Verify Your Email",
          html: emailTemplate,
        });
        Logger.info("Email verification sent to user", user.email);
      } catch (error: any) {
        Logger.error("Failed to send verification email", error);
      }

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: StringValues.SUCCESS,
        data: {
          user: user,
          token,
          pendingJoinRequest: joinRequests,
          currentOrganization: highest.organization,
        },
      });
    } catch (error: any) {
      Logger.error("Registration error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getCarers = async (req: IRequest, res: Response): Promise<void> => {
    try {
      const carers = [];
      res.status(200).json({ carers });
    } catch (error: any) {
      Logger.error("Get carers error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching carers" });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Email and password are required" });
        return;
      }

      const user = await this.authService.findUserByEmail(email);
      if (!user) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "Invalid credentials" });
        return;
      }

      const isPasswordValid = await this.authService.verifyPassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "Invalid credentials" });
        return;
      }

      const token = await this.authService.generateToken(user._id.toString());

      res.status(StatusCodes.OK).json({
        message: "Login successful",
        user: { id: user._id, email: user.email, role: user.role },
        token,
      });
    } catch (error: any) {
      Logger.error("Login error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "An error occurred during login" });
    }
  };
}

class ParentCompanyController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public createParentCompany = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const companyData: Partial<IParentCompany> = req.body;

      if (
        !companyData.name ||
        !companyData.address ||
        !companyData.phone ||
        !companyData.email
      ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const parentCompany = await this.authService.createParentCompany(
        companyData
      );

      res.status(201).json({
        message: "Parent company created successfully",
        parentCompany,
      });
    } catch (error: any) {
      Logger.error("Create parent company error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while creating parent company" });
    }
  };

  public addOrganizationToParentCompany = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationId, parentCompanyId } = req.body;

      if (!organizationId || !parentCompanyId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.authService.addOrganizationToParentCompany(
        organizationId,
        parentCompanyId
      );

      res.status(200).json({
        message: "Organization added to parent company successfully",
      });
    } catch (error: any) {
      Logger.error("Add organization to parent company error:", error);
      res.status(500).json({
        error: "An error occurred while adding organization to parent company",
      });
    }
  };

  public removeOrganizationFromParentCompany = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationId, parentCompanyId } = req.body;

      if (!organizationId || !parentCompanyId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await this.authService.removeOrganizationFromParentCompany(
        organizationId,
        parentCompanyId
      );

      res.status(200).json({
        message: "Organization removed from parent company successfully",
      });
    } catch (error: any) {
      Logger.error("Remove organization from parent company error:", error);
      res.status(500).json({
        error:
          "An error occurred while removing organization from parent company",
      });
    }
  };
}

export { UserController, ParentCompanyController };
