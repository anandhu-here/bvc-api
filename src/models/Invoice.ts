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
    enum: ["draft", "sent", "paid", "overdue", "accepted", "rejected"],
    default: "draft",
  },
});

// Auto-generate invoice number before saving
invoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    const latestInvoice = await this.constructor.findOne(
      {},
      {},
      { sort: { invoiceNumber: -1 } }
    );
    const latestNumber = latestInvoice
      ? parseInt(latestInvoice.invoiceNumber.split("-")[1])
      : 0;
    this.invoiceNumber = `INV-${(latestNumber + 1)
      .toString()
      .padStart(6, "0")}`;
  }
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
