import { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import { EHttpMethod } from "src/enums";
import ApiError from "src/exceptions/ApiError";
import CustomError from "src/helpers/ErrorHelper";
import { IRequest, IResponse } from "src/interfaces/core/express";
import Logger from "src/logger";
import EmailServices from "src/services/EmailService";
import InvitationService from "src/services/InvitationService";
import UserService from "src/services/UserService";
import { getHomeTemplate } from "../email/templates/toHome";
import { getCarerTemplate } from "../email/templates/toCarer";
import TokenServiceHelper from "src/helpers/InvTokenHelper";

class Invitation {
  private readonly _invitationSvc: InvitationService;
  private readonly _userSvc: UserService;
  private readonly _emailSvc: EmailServices;

  constructor(
    readonly invitationSvc: InvitationService,
    readonly userSvc: UserService
  ) {
    this._invitationSvc = invitationSvc;
    this._userSvc = userSvc;
    this._emailSvc = new EmailServices();
  }

  /**
   * @name getInvitations
   * @description Get all invitations for the current user (sent and received).
   * @param req Request
   * @param res Response
   * @param next NextFunction
   * @returns Promise<any>
   */
  public getInvitations = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const userId = req.currentUser._id as string;

      const invitations = await this._invitationSvc.getInvitationsExc(userId);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.INVITATIONS_FETCHED_SUCCESS,
        data: invitations,
      });
    } catch (error: any) {
      Logger.error(
        "InvitationController: getInvitations",
        "errorInfo:" + JSON.stringify(error)
      );
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  /**
   * @name cancelInvitation
   * @description Cancel a join invitation (sender only).
   * @param req Request
   * @param res Response
   * @param next NextFunction
   * @returns Promise<any>
   */
  public cancelInvitation = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.DELETE) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const userId = req.currentUser._id as string;
      const { invitationId } = req.params;

      if (!invitationId) {
        return next(
          new ApiError(
            StringValues.INVITATION_ID_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      await this._invitationSvc.cancelInvitationExc(invitationId, userId);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.INVITATION_CANCELLED_SUCCESS,
      });
    } catch (error: any) {
      Logger.error(
        "InvitationController: cancelInvitation",
        "errorInfo:" + JSON.stringify(error)
      );
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public sendInvitation = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.POST) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const senderId = req.currentUser._id;
      const { receiverId } = req.body;

      if (!receiverId) {
        return next(
          new ApiError(
            StringValues.RECEIVER_ID_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const invitation = await this._invitationSvc.sendInvitationExc(
        senderId as string,
        receiverId,
        req.currentUser.accountType
      );

      const token = invitation.invToken;
      const receiver = await this._userSvc.findUserByIdExc(receiverId);

      let template = getHomeTemplate(
        `wyecare.com?token=${token}&company=${req.currentUser?.company.name}`
      );
      if (["carer", "nurse"].includes(receiver.accountType)) {
        template = getCarerTemplate(
          `wyecare.com?token=${token}&company=${req.currentUser?.company.name}`
        );
      }

      if (["carer", "nurse"].includes(receiver.accountType)) {
        template = getCarerTemplate(
          `wyecare.com?token=${token}&company=${req.currentUser?.company.name}`
        );
      }

      // // Send email to the receiver
      // await this._emailSvc.sendEmail({
      //   from: "annusathee@gmail.com",
      //   to: receiver.email,
      //   subject: "Join Invitation",
      //   html: template,
      // });

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: StringValues.INVITATION_SENT_SUCCESS,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error(
        "InvitationController: sendInvitation",
        "errorInfo:" + JSON.stringify(error)
      );
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  /**
   * @name acceptInvitation
   * @description Accept a join invitation.
   * @param req Request
   * @param res Response
   * @param next NextFunction
   * @returns Promise<any>
   */
  public acceptInvitation = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.PUT) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const userId = req.currentUser._id as string;
      const { invitationId } = req.params;

      if (!invitationId) {
        return next(
          new ApiError(
            StringValues.INVITATION_ID_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const invitation = await this._invitationSvc.acceptInvitationExc(
        invitationId,
        userId
      );

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.INVITATION_ACCEPTED_SUCCESS,
        data: invitation,
      });
    } catch (error: any) {
      console.log(error, "error");
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error:
          error instanceof CustomError
            ? error.message
            : error || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  /**
   * @name rejectInvitation
   * @description Reject a join invitation.
   * @param req Request
   * @param res Response
   * @param next NextFunction
   * @returns Promise<any>
   */
  public rejectInvitation = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.PUT) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const userId = req.currentUser._id as string;
      const { invitationId } = req.params;

      if (!invitationId) {
        return next(
          new ApiError(
            StringValues.INVITATION_ID_REQUIRED,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const invitation = await this._invitationSvc.rejectInvitationExc(
        invitationId,
        userId
      );

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.INVITATION_REJECTED_SUCCESS,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error(
        "InvitationController: rejectInvitation",
        "errorInfo:" + JSON.stringify(error)
      );
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getInvitation = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> => {
    if (req.method !== EHttpMethod.GET) {
      return next(
        new ApiError(StringValues.INVALID_REQUEST_METHOD, StatusCodes.NOT_FOUND)
      );
    }

    try {
      const token = req.params.invToken;
      if (!token) {
        return next(
          new ApiError(StringValues.TOKEN_NOT_FOUND, StatusCodes.BAD_REQUEST)
        );
      }
      if (token === "null") {
        return next(
          new ApiError(StringValues.TOKEN_NOT_FOUND, StatusCodes.BAD_REQUEST)
        );
      }
      const { invitation: invitationObj, decoded } =
        await TokenServiceHelper.verifyToken(token);

      if (!invitationObj) {
        return next(
          new ApiError(StringValues.INVITATION_NOT_FOUND, StatusCodes.NOT_FOUND)
        );
      }

      if (
        invitationObj.receiverId.toString() !== req.currentUser._id.toString()
      ) {
        return next(
          new ApiError(StringValues.UNAUTHORIZED, StatusCodes.UNAUTHORIZED)
        );
      }
      // const isExpired = await decoded.isExpired();
      // if (isExpired) {
      //   return next(
      //     new ApiError(StringValues.TOKEN_EXPIRED, StatusCodes.UNAUTHORIZED)
      //   );
      // }

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Invitation fetch success",
        data: invitationObj,
      });
    } catch (error: any) {
      Logger.error(
        "InvitationController: getInvitation",
        "errorInfo:" + JSON.stringify(error)
      );
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default Invitation;
