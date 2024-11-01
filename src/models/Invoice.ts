import { Schema } from "mongoose";

const mongoose = require("mongoose");

const shiftSummarySchema = new Schema(
  {
    shiftType: String,
    count: Number,
    weekdayHours: Number,
    weekendHours: Number,
    weekdayRate: Number,
    weekendRate: Number,
    totalAmount: Number,
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: false,
    unique: true,
  },
  homeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  shiftSummary: { type: Map, of: shiftSummarySchema },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  status: {
    type: String,
    enum: ["draft", "pending", "sent", "paid", "cancelled", "partially_paid"],
    default: "draft",
  },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
