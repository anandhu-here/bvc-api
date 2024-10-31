import { NextFunction } from "express";
import { IRequest, IResponse } from "src/interfaces/core/express";
import invitationValidagtor from "src/validators/invitation";
import jwt from "jsonwebtoken";
import { IJoinInvitation } from "src/interfaces/entities/invitations";
import Logger from "src/logger";
import TokenServiceHelper from "src/helpers/InvTokenHelper";
import ApiError from "src/exceptions/ApiError";
import StringValues from "src/constants/strings";
import StatusCodes from "src/constants/statusCodes";

class InvitationMidleWare {
  public static async validateInvitation(
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> {
    try {
      const invToken = req.params.invToken;
      if (!invToken) {
        return next(
          new ApiError(StringValues.TOKEN_NOT_FOUND, StatusCodes.NOT_FOUND)
        );
      }
      const { invitation, decoded } = await TokenServiceHelper.verifyToken(
        invToken
      );

      if (!decoded) {
        return next(
          new ApiError(
            StringValues.TOKEN_NOT_VERIFIED,
            StatusCodes.UNAUTHORIZED
          )
        );
      }
      const isExpired = await decoded.isExpired();

      if (isExpired) {
        res.status(StatusCodes.UNAUTHORIZED);

        return res.json({
          success: false,
          error: StringValues.TOKEN_EXPIRED,
          isExpired: isExpired,
        });
      }

      if (!invitation) {
        return next(
          new ApiError(StringValues.USER_NOT_FOUND, StatusCodes.NOT_FOUND)
        );
      }

      next();
      const { receiverId }: IJoinInvitation = req.body;

      const senderId = req.currentUser._id;

      const { error } = invitationValidagtor.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const payload = {
        senderId,
        receiverId,
      };

      Logger.info("Invitation payload: ", payload);

      const options = {
        expiresIn: "1h",
      };

      const token = await jwt.sign(payload, process.env.JWT_SECRET, options);

      Logger.info("Invitation token: ", token);
      req.invToken = token;
      next();
    } catch (error: any) {
      next(error);
    }
  }
}

export default InvitationMidleWare;
