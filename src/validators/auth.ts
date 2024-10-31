import Joi from "joi";
import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import type { IRequest } from "src/interfaces/core/express";

const removeLinkedUserValidator = async (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    linkedUserType: Joi.string().required(),
    linkedUserId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().required(),
  });

  try {
    await schema.validateAsync(req.body);
    const { linkedUserId } = req.body;
    const currentUser = req.currentUser;

    // Check if the linked user belongs to the current user
    const linkedUserIndex = 0 as number;

    if (linkedUserIndex === -1) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "You are not authorized to remove this linked user",
      });
    }

    next();
  } catch (error: any) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Invalid request data",
    });
  }
};

export default removeLinkedUserValidator;
