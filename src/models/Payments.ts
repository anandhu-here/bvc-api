import mongoose, { Schema, Document, Types } from "mongoose";
import type { IPaymentModel } from "src/interfaces/entities/payement";

const PaymentSchema: Schema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true },
  stripeCustomerId: { type: String, required: true },
  subscriptionId: { type: String, required: true },
  planId: { type: String, required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: ["active", "canceled", "past_due", "unpaid", "incomplete"],
    required: true,
  },
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: { type: Date },
  trialStart: { type: Date },
  trialEnd: { type: Date },
  lastPaymentDate: { type: Date },
  nextPaymentDate: { type: Date },
  failedPayments: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ["credit_card", "debit_card", "paypal"],
    required: true,
  },
  paymentMethodDetails: {
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
  },
  invoices: [
    {
      invoiceId: String,
      amount: Number,
      status: {
        type: String,
        enum: ["paid", "open", "void", "uncollectible"],
      },
      date: Date,
    },
  ],

  organizationType: { type: String, enum: ["home", "agency"], required: true },
  planTier: {
    type: String,
    enum: ["basic", "pro", "enterprise"],
    required: true,
  },
});

export default mongoose.model<IPaymentModel>("Payment", PaymentSchema);
