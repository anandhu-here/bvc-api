import { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import { EHttpMethod } from "src/enums";
import ApiError from "src/exceptions/ApiError";
import CustomError from "src/helpers/ErrorHelper";
import { IRequest, IResponse } from "src/interfaces/core/express";
import Logger from "src/logger";
import EmailServices from "src/services/EmailService";
import UserService from "src/services/UserService";
import TokenServiceHelper from "src/helpers/InvTokenHelper";
import InvitationService from "src/services/invService";
import { getGeneralInvitationTemplate } from "../email/templates/toHomeStaffs";

class InvitationController {
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
      const email = req.currentUser.email;
      const invitations = await this._invitationSvc.getInvitations(
        userId,
        email
      );

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: StringValues.INVITATIONS_FETCHED_SUCCESS,
        data: invitations,
      });
    } catch (error: any) {
      Logger.error("InvitationController: getInvitations", error);
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
      const { receiverEmail, accountType, companyName } = req.body;

      if (!receiverEmail || !accountType) {
        return next(
          new ApiError(
            'Missing required fields: "receiverEmail", "accountType", "companyName"',
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const invitation = await this._invitationSvc.sendInvitation(
        senderId as string,
        receiverEmail,
        accountType,
        req.currentUser.company.name,
        req.currentUser.accountType
      );

      let template = getGeneralInvitationTemplate(
        `${process.env.FRONTEND_URL}/login?token=${invitation.invToken}&company=${companyName}`,
        companyName
      );

      await this._emailSvc.sendEmail({
        to: receiverEmail,
        subject: "Invitation",
        html: template,
      });

      res.status(StatusCodes.CREATED);
      return res.json({
        success: true,
        message: StringValues.INVITATION_SENT_SUCCESS,
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("InvitationController: sendInvitation", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public updateInvitationStatus = async (
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
      const { invitationId } = req.params;
      const { status } = req.body;

      if (!invitationId || !status) {
        return next(
          new ApiError(
            'Missing required fields: "invitationId", "status"',
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const invitation = await this._invitationSvc.updateInvitationStatus(
        invitationId,
        status
      );

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Invitation status updated successfully",
        data: invitation,
      });
    } catch (error: any) {
      Logger.error("InvitationController: updateInvitationStatus", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error:
          error instanceof CustomError
            ? error.message
            : StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
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
      const { invitationId } = req.params;
      const userId = req.currentUser._id as string;
      const email = req.currentUser.email;

      await this._invitationSvc.acceptInvitation(invitationId, email);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Invitation accepted successfully",
      });
    } catch (error: any) {
      Logger.error("InvitationController: acceptInvitation", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error:
          error instanceof CustomError
            ? error.message
            : StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public getInvitationByToken = async (
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
      const { token } = req.params;
      const userId = req.currentUser._id;
      if (!token) {
        return next(
          new ApiError(StringValues.TOKEN_NOT_FOUND, StatusCodes.BAD_REQUEST)
        );
      }

      const invitation = await this._invitationSvc.getInvitationByToken(
        token,
        userId as string
      );

      if (!invitation) {
        return next(
          new ApiError(StringValues.INVITATION_NOT_FOUND, StatusCodes.NOT_FOUND)
        );
      }

      const user = await this._userSvc.findUserByIdExc(
        invitation.senderId.toString()
      );

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Invitation fetched successfully",
        data: {
          ...invitation,
          company: user.company,
        },
      });
    } catch (error: any) {
      Logger.error("InvitationController: getInvitationByToken", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error: error.message || StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };

  public deleteInvitation = async (
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
      const { invitationId } = req.params;
      const userId = req.currentUser._id as string;

      await this._invitationSvc.deleteInvitation(invitationId, userId);

      res.status(StatusCodes.OK);
      return res.json({
        success: true,
        message: "Invitation deleted successfully",
      });
    } catch (error: any) {
      Logger.error("InvitationController: deleteInvitation", error);
      res.status(StatusCodes.BAD_REQUEST);
      return res.json({
        success: false,
        error:
          error instanceof CustomError
            ? error.message
            : StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default InvitationController;
