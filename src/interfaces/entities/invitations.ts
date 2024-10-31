import { Types } from "mongoose";
import { Document } from "mongoose";

export interface IJoinInvitation extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  invToken?: string;
  senderAccountType?: string;
  generateToken(): Promise<string>;
}
