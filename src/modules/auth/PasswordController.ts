/**
 * Define Password Controller Class
 */

import { EHttpMethod } from "../../enums";
import type { IRequest, IResponse, INext } from "../../interfaces/core/express";
import ApiError from "../../exceptions/ApiError";
import StatusCodes from "../../constants/statusCodes";
import StringValues from "../../constants/strings";
import Logger from "../../logger";
import type UserService from "../../services/UserService";
import Validators from "../../utils/validator";
import OtpServiceHelper from "../../helpers/OtpServiceHelper";
import EmailTemplateHelper from "../../helpers/MailTemplateHelper";
import MailServiceHelper from "../../helpers/MailServiceHelper";
import Otp from "../../models/Otp";
import EmailServices from "src/services/EmailService";
import { getPasswordResetTemplate } from "../email/templates/passwrod-reset";

class PasswordController {
  private readonly _userSvc: UserService;
  private readonly _emailSvc: EmailServices;
  constructor(readonly userSvc: UserService) {
    this._userSvc = userSvc;
    this._emailSvc = new EmailServices();
  }

  public requestPasswordReset = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    const { email } = req.body;
    const user = await this._userSvc.findUserByEmailExc(email);

    if (!email) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: StringValues.EMAIL_REQUIRED,
      });
      return;
    }

    const resetToken = await this._userSvc.generatePasswordResetToken(email);
    if (!resetToken) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: StringValues.USER_NOT_FOUND,
      });
      return;
    }

    const template = getPasswordResetTemplate(
      `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      user.fname
    );
    try {
      await this._emailSvc.sendEmail({
        to: email,
        subject: "Password Reset Request",
        html: template,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.PASSWORD_RESET_EMAIL_SENT,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: StringValues.EMAIL_SEND_ERROR,
      });
    }
  };

  public resetPassword = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: StringValues.INVALID_REQUEST,
      });
      return;
    }

    const user = await this._userSvc.findUserByResetToken(token);
    if (!user) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: StringValues.INVALID_OR_EXPIRED_TOKEN,
      });
      return;
    }

    const resetSuccess = await this._userSvc.resetPassword(
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

  /**
   * @name sendResetPasswordOtp
   * @description Perform send reset password otp action.
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public sendResetPasswordOtp = async (
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
        email,
        password,
        confirmPassword,
      }: { email: string; password: string; confirmPassword: string } =
        req.body;

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

      const _email = email?.toLowerCase().trim();

      const isEmailExists = await this._userSvc.checkIsEmailExistsExc(_email);
      if (!isEmailExists) {
        return next(
          new ApiError(
            StringValues.EMAIL_NOT_REGISTERED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Generating OTP
      const newOtp = await OtpServiceHelper.generateOtpFromEmail(_email);

      if (!newOtp) {
        return next(
          new ApiError(StringValues.OTP_CREATE_ERROR, StatusCodes.BAD_REQUEST)
        );
      }

      const currentUser = await this._userSvc.findUserByEmailExc(_email);

      // Sending Email
      const htmlMessage = await EmailTemplateHelper.getOtpEmail(
        newOtp.otp,
        `${currentUser.fname} ${currentUser.lname}`
      );

      if (htmlMessage) {
        await MailServiceHelper.sendEmail({
          to: _email,
          subject: "OTP For Password Reset",
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
        "PasswordController: sendResetPasswordOtp",
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
   * @name resetPassword
   * @description Perform reset password action.
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */

  /**
   * @name changePassword
   * @description Perform change password action.
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public changePassword = async (
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
        oldPassword,
        password,
        confirmPassword,
      }: {
        oldPassword: string;
        password: string;
        confirmPassword: string;
      } = req.body;

      if (!oldPassword) {
        return next(
          new ApiError(
            StringValues.OLD_PASSWORD_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (oldPassword.length < 8) {
        return next(
          new ApiError(
            StringValues.OLD_PASSWORD_MIN_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (oldPassword.length > 32) {
        return next(
          new ApiError(
            StringValues.OLD_PASSWORD_MAX_LENGTH_ERROR,
            StatusCodes.BAD_REQUEST
          )
        );
      }

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

      const currentUser = req.currentUser;

      if (!currentUser) {
        return next(
          new ApiError(StringValues.USER_NOT_FOUND, StatusCodes.NOT_FOUND)
        );
      }

      // Validating Old Password
      const isPasswordMatched = await currentUser.matchPassword(oldPassword);
      if (!isPasswordMatched) {
        return next(
          new ApiError(
            StringValues.INCORRECT_OLD_PASSWORD,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Set Password
      await currentUser.setPassword(password.trim());

      // Send Welcome Email
      // const htmlMessage = await EmailTemplateHelper.getOtpEmail(_name);

      // if (htmlMessage) {
      //   await MailServiceHelper.sendEmail({
      //     to: _email,
      //     subject: "Welcome To NixLab Jobs",
      //     htmlContent: htmlMessage,
      //   });
      // }

      // Generate New Token
      await currentUser.getToken(true);

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: StringValues.SUCCESS,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || error || StringValues.SOMETHING_WENT_WRONG;

      Logger.error(
        "PasswordController: changePassword",
        "errorInfo:" + JSON.stringify(error)
      );

      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: errorMessage,
      });
    }
  };
}

export default PasswordController;
