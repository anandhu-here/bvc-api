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
    // New invoice-related fields
    invoiceStatus: {
      type: String,
      enum: ["pending_invoice", "invoiced", "paid", null],
      default: null,
    },
    invoiceId: {
      type: Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    invoicedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
    },
    // Existing fields
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
    approvedBy: { type: Types.ObjectId, ref: "User" },
    tokenForQrCode: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for invoice-related queries
TimesheetSchema.index({ invoiceStatus: 1, invoiceId: 1 });
TimesheetSchema.index({ home: 1, invoiceStatus: 1 });
TimesheetSchema.index({ agency: 1, invoiceStatus: 1 });

TimesheetSchema.virtual("shift", {
  ref: "Shift",
  localField: "shiftId",
  foreignField: "_id",
  justOne: true,
});

// Add pre-save middleware to handle invoice status changes
TimesheetSchema.pre("save", function (next) {
  if (this.isModified("invoiceStatus")) {
    switch (this.invoiceStatus) {
      case "invoiced":
        this.invoicedAt = new Date();
        break;
      case "paid":
        this.paidAt = new Date();
        break;
      case "pending_invoice":
      default:
        // No additional action needed
        break;
    }
  }
  next();
});

const TimesheetModel = model<ITimesheet>("Timesheet", TimesheetSchema);

export default TimesheetModel;
