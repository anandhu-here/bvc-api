import { Document, Types, type ObjectId } from "mongoose";

export interface IPaymentModel extends Document {
  _id: ObjectId;
  user: ObjectId;
  stripeCustomerId: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: "active" | "canceled" | "past_due" | "unpaid" | "incomplete";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  failedPayments: number;
  paymentMethod: "credit_card" | "debit_card" | "paypal";
  paymentMethodDetails: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };
  invoices: Array<{
    invoiceId: string;
    amount: number;
    status: "paid" | "open" | "void" | "uncollectible";
    date: Date;
  }>;
}
