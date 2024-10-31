import type ProfileService from "../../services/ProfileService";
import StatusCodes from "../../constants/statusCodes";
import StringValues from "../../constants/strings";
import ApiError from "../../exceptions/ApiError";
import MailServiceHelper from "../../helpers/MailServiceHelper";
import EmailTemplateHelper from "../../helpers/MailTemplateHelper";
import OtpServiceHelper from "../../helpers/OtpServiceHelper";
import type { IRegisterBodyData } from "../../interfaces/bodyData";
import type { IRequest, IResponse, INext } from "../../interfaces/core/express";
import type { IUser } from "../../interfaces/entities/user";
import Logger from "../../logger";
import type UserService from "../../services/UserService";
import Validators from "../../utils/validator";
import { EHttpMethod } from "../../enums";
import type ShiftService from "src/services/ShiftService";
import { Types, type ObjectId } from "mongoose";
import TimelineService from "src/services/TimelineService";
import { generateVerificationToken } from "src/utils/email-token";
import { getEmailVerificationTemplate } from "../email/templates/verify-email";
import EmailServices from "src/services/EmailService";
import InvitationService from "src/services/InvitationService";
import UserRelationship from "src/models/UserRelationShip";

class RegisterController {
  private readonly _userSvc: UserService;
  private readonly _profileSvc: ProfileService;
  private readonly _timeliineSvc: TimelineService;
  private readonly _emailSvc: EmailServices;
  private readonly _invSvc: InvitationService;

  constructor(
    readonly userSvc: UserService,
    readonly profileSvc: ProfileService,
    readonly shiftSvc: ShiftService
  ) {
    this._userSvc = userSvc;
    this._profileSvc = profileSvc;
    this._timeliineSvc = new TimelineService();
    this._emailSvc = new EmailServices();
    this._invSvc = new InvitationService();
  }

  /**
   * @name sendRegisterOtp
   * @description Perform send register otp action.
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public sendRegisterOtp = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const {
        fname,
        lname,
        email,
        password,
        confirmPassword,
      }: IRegisterBodyData = req.body;

      if (!fname) {
        return next(
          new ApiError(
            StringValues.FIRST_NAME_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!lname) {
        return next(
          new ApiError(StringValues.LAST_NAME_REQUIRED, StatusCodes.BAD_REQUEST)
        );
      }

      if (!email) {
        return next(
          new ApiError(StringValues.EMAIL_REQUIRED, StatusCodes.BAD_REQUEST)
        );
      }

      if (!Validators.validateEmail(email)) {
        return next(
          new ApiError(
            StringValues.INVALID_EMAIL_FORMAT,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // if (!Validators.validateUsername(username)) {
      //   return next(
      //     new ApiError(
      //       StringValues.INVALID_USERNAME_FORMAT,
      //       StatusCodes.BAD_REQUEST
      //     )
      //   );
      // }

      if (!password) {
        return next(
          new ApiError(StringValues.PASSWORD_REQUIRED, StatusCodes.BAD_REQUEST)
        );
      }

      if (password.length < 8) {
        return next(
          new ApiError(
            StringValues.PASSWORD_MIN_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (password.length > 32) {
        return next(
          new ApiError(
            StringValues.PASSWORD_MAX_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!confirmPassword) {
        return next(
          new ApiError(
            StringValues.CONFIRM_PASSWORD_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (confirmPassword.length < 8) {
        return next(
          new ApiError(
            StringValues.CONFIRM_PASSWORD_MIN_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (confirmPassword.length > 32) {
        return next(
          new ApiError(
            StringValues.CONFIRM_PASSWORD_MAX_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (password.trim() !== confirmPassword.trim()) {
        return next(
          new ApiError(
            StringValues.PASSWORDS_DO_NOT_MATCH,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const _fname = fname?.trim();
      const _lname = lname?.trim();
      const _email = email?.toLowerCase().trim();

      const isEmailExists = await this._userSvc.checkIsEmailExistsExc(_email);
      if (isEmailExists) {
        res.status(StatusCodes.BAD_REQUEST);
        return res.json({
          success: false,
          message: StringValues.EMAIL_ALREADY_REGISTERED,
          isEmailUsed: true,
        });
      }

      // Generating OTP
      const newOtp = await OtpServiceHelper.generateOtpFromEmail(_email);

      if (!newOtp) {
        return next(
          new ApiError(StringValues.OTP_CREATE_ERROR, StatusCodes.BAD_REQUEST)
        );
      }

      // Sending Email
      const htmlMessage = await EmailTemplateHelper.getOtpEmail(
        newOtp.otp,
        `${_fname} ${_lname}`
      );

      if (htmlMessage) {
        await MailServiceHelper.sendEmail({
          to: _email,
          subject: "OTP For Registration",
          htmlContent: htmlMessage,
        });
      }

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.SUCCESS,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;

      Logger.error(
        "RegisterController: sendRegisterOtp",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: errorMessage,
      });
    }
  };

  /**
   * @name registerUser
   * @description Perform register user action.
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public register = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const {
        // Basic Information
        fname,
        lname,
        email,
        phone,
        countryCode,

        // Address Details
        address1,
        address2,
        city,
        state,
        postalCode,
        country,

        // Account Setup
        password,
        confirmPassword,
        accountType,
        company,

        // Additional Data
        availabilities,
        ...additionalData
      }: IRegisterBodyData & Partial<Record<string, any>> = req.body;

      const { linkedUserId, linkedUserType } = additionalData;

      // Validate required fields
      if (
        !fname ||
        !lname ||
        !email ||
        !phone ||
        !password ||
        !confirmPassword ||
        !accountType
      ) {
        return next(
          new ApiError(
            StringValues.MISSING_REQUIRED_FIELDS,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Validate email format
      if (!Validators.validateEmail(email)) {
        return next(
          new ApiError(
            StringValues.INVALID_EMAIL_FORMAT,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Validate password
      if (password.length < 8 || password.length > 32) {
        return next(
          new ApiError(
            StringValues.INVALID_PASSWORD_LENGTH,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (password.trim() !== confirmPassword.trim()) {
        return next(
          new ApiError(
            StringValues.PASSWORDS_DO_NOT_MATCH,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const _email = email?.toLowerCase().trim();

      const isEmailExists = await this._userSvc.checkIsEmailExistsExc(_email);
      if (isEmailExists) {
        res.status(StatusCodes.BAD_REQUEST);
        return res.json({
          success: false,
          message: StringValues.EMAIL_ALREADY_REGISTERED,
          isEmailUsed: true,
        });
      }

      const _currentDateTime = new Date(Date.now());

      // Create User
      const newUserData: Partial<IUser> = {
        fname: fname.trim(),
        lname: lname.trim(),
        nameChangedAt: _currentDateTime,
        email: _email,
        isEmailVerified: false,
        emailChangedAt: _currentDateTime,
        phone: phone.trim(),
        countryCode: countryCode.trim(),
        isPhoneVerified: false,
        phoneChangedAt: _currentDateTime,
        accountType: accountType,
        company: company
          ? {
              name: company.name,
              address: `${address1}, ${
                address2 ? address2 + ", " : ""
              }${city}, ${state} ${postalCode}, ${country}`,
            }
          : undefined,
        availabilities: availabilities,
      };

      const emailToken = await generateVerificationToken();

      const newUser = await this._userSvc.createUserExc({
        ...newUserData,
        emailVerificationToken: emailToken,
      });

      // Create user relationship if linkedUserId is provided
      if (linkedUserId && linkedUserType) {
        await UserRelationship.create({
          userId: newUser._id,
          relatedUserId: linkedUserId,
          relationshipType: linkedUserType,
        });

        // Create the reverse relationship
        await UserRelationship.create({
          userId: linkedUserId,
          relatedUserId: newUser._id,
          relationshipType: accountType,
        });
      }

      // Set Password
      await newUser.setPassword(password.trim());

      await this._profileSvc.getProfileExc(newUser);
      const authToken = await newUser.getToken();
      const resData = {
        token: authToken.token,
        expiresAt: authToken.expiresAt,
        user: newUser,
      };

      // Send verification email
      const template = getEmailVerificationTemplate(
        `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`,
        newUser.fname
      );

      try {
        await this._emailSvc.sendEmail({
          to: newUser.email,
          subject: "Verify Your Email",
          html: template,
        });
      } catch (error: any) {
        Logger.error("Failed to send verification email", error);
      }

      Logger.info("Email verification sent to user", newUser.email);

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: StringValues.SUCCESS,
        data: resData,
      });
    } catch (error: any) {
      console.log(error, "ererer");
      Logger.error(
        "RegisterController: register",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error?.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  /**
   * @name linkUser
   * @description Link a user to the currently authenticated user.
   * @param req IRequest
   * @param res IResponse
   * @returns Promise<any>
   */
  public linkUser = async (req: IRequest, res: IResponse): Promise<any> => {
    try {
      const currentUser = req.currentUser;
      const { linkedUserId, linkedUserType } = req.body;

      if (!linkedUserId || !linkedUserType) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Linked user ID and type are required",
        });
      }

      const linkedUser = await this._userSvc.findUserByIdExc(linkedUserId);

      if (!linkedUser) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Linked user not found",
        });
      }

      // Check if the relationship already exists
      const existingRelationship = await UserRelationship.findOne({
        userId: currentUser._id,
        relatedUserId: linkedUserId,
        relationshipType: linkedUserType,
      });

      if (existingRelationship) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Users are already linked",
        });
      }

      // Create new relationships
      const relationship1 = new UserRelationship({
        userId: currentUser._id,
        relatedUserId: linkedUserId,
        relationshipType: linkedUserType,
      });

      const relationship2 = new UserRelationship({
        userId: linkedUserId,
        relatedUserId: currentUser._id,
        relationshipType: currentUser.accountType,
      });

      await Promise.all([relationship1.save(), relationship2.save()]);

      // Update user documents
      if (linkedUserType === "agency") {
        await this.userSvc.findByIdAndUpdate(currentUser._id.toString(), {
          isAgencyStaff: true,
        });
      }
      if (linkedUserType === "home") {
        await this.userSvc.findByIdAndUpdate(currentUser._id.toString(), {
          isHomeStaff: true,
        });
      }

      // Handle timeline update if necessary
      if (
        ["carer", "nurse"].includes(currentUser.accountType) &&
        (linkedUserType === "agency" || linkedUserType === "home")
      ) {
        await this._timeliineSvc.addCompanyToTimeline(
          currentUser._id as Types.ObjectId,
          linkedUserId,
          new Date(),
          "",
          currentUser.accountType
        );
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Users linked successfully",
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;
      console.error("Error in linkUser:", error);

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: errorMessage,
      });
    }
  };
  /**
   * @name removeLinkedUser
   * @description Remove a linked user from the currently authenticated user.
   * @param req IRequest
   * @param res IResponse
   * @returns Promise<any>
   */
  public removeLinkedUser = async (
    req: IRequest,
    res: IResponse
  ): Promise<any> => {
    try {
      const currentUser = req.currentUser;
      const { linkedUserType, linkedUserId, review, rating } = req.body;

      if (!linkedUserType || !linkedUserId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Linked user type and ID are required",
        });
      }

      if (
        ["home", "agency"].includes(currentUser.accountType) &&
        ["carer", "nurse"].includes(linkedUserType)
      ) {
        const response = await this._timeliineSvc.removeCurrentCompany(
          linkedUserId,
          rating,
          review
        );
      }

      if (
        (linkedUserType === "agency" || linkedUserType === "home") &&
        ["carer", "nurse"].includes(currentUser.accountType)
      ) {
        const response = await this._timeliineSvc.removeCurrentCompany(
          linkedUserId,
          rating,
          review
        );
      }

      const updatedUser = await this._userSvc.removeLinkedUser(
        currentUser._id as string,
        linkedUserType,
        linkedUserId
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Linked user removed successfully",
        data: updatedUser,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;

      Logger.error(
        "UserController: removeLinkedUser",
        "errorInfo:" + JSON.stringify(error)
      );

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: errorMessage,
      });
    }
  };
}

export default RegisterController;
