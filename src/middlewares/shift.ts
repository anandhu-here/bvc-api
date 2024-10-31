import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import { Types } from "mongoose";
import StatusCodes from "src/constants/statusCodes";
import type { IRequest } from "src/interfaces/core/express";
import type { IShift } from "src/interfaces/entities/shift";
import ShiftModel from "src/models/Shift";
import { assignCarersSchema } from "src/validators/shift";

class ShiftMiddleware {
  public validateShiftRequest(schema: Schema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error } = schema.validate(req.body);
      if (error) {
        const errorMessage = error.details
          .map((detail) => detail.message)
          .join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      next();
    };
  }

  public async validateAssignCarers(
    req: IRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { error } = assignCarersSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { carerIds, shiftId } = req.body;
      const agency = req.currentUser;

      const shift: IShift | null = await ShiftModel.findById(shiftId);

      if (agency.accountType !== "agency") {
        return res
          .status(403)
          .json({ error: "Only agencies can assign carers to shifts" });
      }

      // const linkedCarerIds = agency.linkedUsers
      //   .find((linkedUser) =>
      //     ["carer", "nurse"].includes(linkedUser.accountType)
      //   )
      //   ?.users.map((userId) => userId.toString());

      if (carerIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "At least one carer ID is required to assign carers to a shift",
        });
      } else if (carerIds.length > shift.count) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "The number of carers assigned to a shift cannot exceed the shift count",
        });
      }

      const validCarerIds = carerIds.filter((carerId) => true);

      if (validCarerIds.length !== carerIds.length) {
        return res.status(400).json({
          error: "Some of the provided carer IDs are not linked to the agency",
        });
      }

      req.body.validCarerIds = validCarerIds.map(
        (carerId) => new Types.ObjectId(carerId)
      );
      next();
    } catch (error: any) {
      console.error("Error in validateAssignCarers middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  public async validateUnassignCarer(
    req: IRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { shiftId } = req.params;
      const { carerId } = req.body;
      const agency = req.currentUser;

      const shift: IShift | null = await ShiftModel.findById(shiftId);

      if (agency.accountType !== "agency") {
        return res
          .status(403)
          .json({ error: "Only agencies can unassign carers from shifts" });
      }

      if (!shift.assignedUsers.includes(new Types.ObjectId(carerId))) {
        return res.status(400).json({
          error: "The specified carer is not assigned to this shift",
        });
      }

      req.body.carerId = new Types.ObjectId(carerId);
      next();
    } catch (error: any) {
      console.error("Error in validateUnassignCarer middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new ShiftMiddleware();
