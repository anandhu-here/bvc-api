import type { NextFunction } from "express";
import Joi from "joi";
import { Types } from "mongoose";
import StatusCodes from "src/constants/statusCodes";
import type { IRequest, IResponse } from "src/interfaces/core/express";
import ShiftModel from "src/models/Shift";

// Custom validation for ObjectId
const objectIdValidator = (value: any, helpers: Joi.CustomHelpers) => {
  if (!Types.ObjectId.isValid(value)) {
    return helpers.message({ custom: '"{{#label}}" must be a valid ObjectId' });
  }
  return value;
};

export const createShiftSchema = Joi.object({
  agentId: Joi.string().custom(objectIdValidator).required(),
  homeId: Joi.string().custom(objectIdValidator).optional(),
  isAccepted: Joi.boolean().optional(),
  isCompleted: Joi.boolean().optional(),
  shiftType: Joi.string().custom(objectIdValidator).required(),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
  date: Joi.string().required(),
});

export const assignCarersSchema = Joi.object({
  shiftId: Joi.string().required(),
  carerIds: Joi.array().items(Joi.string()).required(),
});

const validateAgencyAccept = async (
  req: IRequest,
  res: IResponse,
  next: NextFunction
) => {
  try {
    // Validate the request body against the schema
    const shiftId = req.params.shiftId;
    if (!shiftId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "shiftId is required" });
    }
    const currentUser = req.currentUser;

    // Check if the user is authenticated
    if (!currentUser) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Authentication required" });
    }

    // Check if the authenticated user has an accountType of 'agency'
    if (currentUser.accountType !== "agency") {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Only agency users can accept shifts" });
    }

    // Find the shift by the provided shiftId
    const shift = await ShiftModel.findById(shiftId).exec();

    if (!shift) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shift not found" });
    }

    if (shift.isAccepted) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Shift is already accepted" });
    }

    // Check if the authenticated user's ID matches the agentId in the shift
    if (shift.agentId.toString() !== currentUser._id.toString()) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "You are not authorized to accept this shift" });
    }

    // If all checks pass, move to the next middleware or route handler
    next();
  } catch (error: any) {
    console.error("Error in validateAgencyUser middleware:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred" });
  }
};

export default validateAgencyAccept;
