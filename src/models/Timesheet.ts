import { Schema, model, Types } from "mongoose";
import { ITimesheet } from "../interfaces/entities/timesheet";
import { ShiftSchema } from "./Shift";
import { required } from "joi";

const TimesheetSchema = new Schema<ITimesheet>(
  {
    shift_: {
      type: Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    carer: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    home: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    agency: {
      type: Types.ObjectId,
      ref: "Organization",
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      default: null,
    },
    requestType: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
      required: false,
    },
    documentUrl: {
      type: String,
      required: false,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tokenForQrCode: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

TimesheetSchema.virtual("shift", {
  ref: "Shift",
  localField: "shiftId",
  foreignField: "_id",
  justOne: true,
});

const TimesheetModel = model<ITimesheet>("Timesheet", TimesheetSchema);

export default TimesheetModel;
