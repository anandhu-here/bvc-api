import { Document, Types } from "mongoose";

export interface IInvitation extends Document {
  senderId: Types.ObjectId;
  receiverId: string; // email
  accountType?:
    | "carer"
    | "agency"
    | "nurse"
    | "home"
    | "admin"
    | "superadmin"
    | "user"
    | "guest"
    | "unknown";
  status: "pending" | "accepted" | "rejected";
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  invToken?: string;
  senderAccountType?: string;
  generateToken(): Promise<string>;
}
