import { Schema, Types, model } from "mongoose";
import type { IUserShiftTypeModel } from "src/interfaces/entities/shift-types";

export const ShiftTypeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  hourlyPay: {
    type: Number,
    required: true,
  },
});

const ShiftTypeModel = new Schema<IUserShiftTypeModel>(
  {
    userId: {
      type: Types.ObjectId,
      required: true,
      ref: "User",
    },
    shifttypes: [ShiftTypeSchema],
  },
  { timestamps: true }
);

const ShiftType = model<IUserShiftTypeModel>("ShiftType", ShiftTypeModel);

export default ShiftType;
