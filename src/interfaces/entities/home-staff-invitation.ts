import { Document, Types } from "mongoose";

export interface IHomeStaffINvitiation extends Document {
  senderId: Types.ObjectId;
  receiverId: string; //email
  accountType?: "carer" | "senior carer" | "nurse" | "guest" | "agency";
  status: "pending" | "accepted" | "rejected";
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  invToken?: string;
  senderAccountType?: string;
  generateToken(): Promise<string>;
}
