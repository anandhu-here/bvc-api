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
}
