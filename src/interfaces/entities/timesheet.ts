import { Document, ObjectId } from "mongoose";
import { IShift } from "./shift";

export interface ITimesheet extends Document {
  shift_: IShift;
  carer: ObjectId;
  home: ObjectId;
  agency?: ObjectId;
  status: "pending" | "approved" | "rejected";
  rating?: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: ObjectId;
  requestType?: "manual" | "auto";
  documentUrl?: string;
  tokenForQrCode?: string;
  // New invoice-related fields
  invoiceStatus: "pending_invoice" | "invoiced" | "paid" | null;
  invoiceId: ObjectId | null;
  invoicedAt: Date | null;
  paidAt: Date | null;
  paymentReference: string | null;
}
