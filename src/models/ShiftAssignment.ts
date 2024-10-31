import mongoose, { Schema } from "mongoose";
import { Document, Types } from "mongoose";

// New IShiftAssignment interface
export interface IShiftAssignment extends Document {
  _id: Types.ObjectId;
  shift: Types.ObjectId;
  user: Types.ObjectId;
  status: "assigned" | "confirmed" | "declined" | "completed" | "signed";
  createdAt?: Date;
  updatedAt?: Date;
}

// New ShiftAssignmentSchema
export const ShiftAssignmentSchema: Schema<IShiftAssignment> =
  new Schema<IShiftAssignment>(
    {
      shift: {
        type: Schema.Types.ObjectId,
        ref: "Shift",
        required: true,
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ["assigned", "confirmed", "declined", "completed", "signed"],
        default: "assigned",
      },
    },
    {
      timestamps: true,
    }
  );

// Export the new model
const ShiftAssignmentModel = mongoose.model<IShiftAssignment>(
  "ShiftAssignment",
  ShiftAssignmentSchema
);
export default ShiftAssignmentModel;
