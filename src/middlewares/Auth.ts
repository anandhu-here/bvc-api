/**
 * Define Auth Middleware
 */

import StatusCodes from "../constants/statusCodes";
import Strings from "../constants/strings";
import ApiError from "../exceptions/ApiError";
import type { INext, IRequest, IResponse } from "../interfaces/core/express";
import User from "../models/User";
import TokenServiceHelper from "../helpers/TokenServiceHelper";
import { registerValidator } from "src/validators/register";
import type { NextFunction } from "express";
import Logger from "src/logger";

class AuthMiddleware {
  /**
   * @name isAuthenticatedUser
   * @description Check if user is authenticated
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public static async isAuthenticatedUser(
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return next(
        new ApiError(
          Strings.AUTH_PARAM_HEADER_NOT_FOUND,
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      return next(
        new ApiError(
          Strings.TOKEN_NOT_FOUND_IN_AUTH_HEADER,
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const decodedToken = await TokenServiceHelper.verifyToken(token);

    if (!decodedToken) {
      return next(
        new ApiError(Strings.TOKEN_NOT_VERIFIED, StatusCodes.UNAUTHORIZED)
      );
    }

    const isExpired = await decodedToken.isExpired();

    if (isExpired) {
      res.status(StatusCodes.UNAUTHORIZED);

      return res.json({
        success: false,
        error: Strings.TOKEN_EXPIRED,
        isExpired: isExpired,
      });
    }

    const reqUser = await User.findById(decodedToken.userId).lean();

    if (!reqUser) {
      return next(new ApiError(Strings.USER_NOT_FOUND, StatusCodes.NOT_FOUND));
    }

    req.currentUser = reqUser as any;
    req.token = token;

    next();
  }
  /**
   * @name validateRegistration
   * @description Validate registration request body
   * @param req IRequest
   * @param res IResponse
   * @param next INext
   * @returns Promise<any>
   */
  public static async validateRegistration(
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> {
    try {
      const { error } = registerValidator.validate(req.body);
      Logger.info("validateRegistration", error);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      next();
    } catch (error: any) {
      next(error);
    }
  }
}

export default AuthMiddleware;
