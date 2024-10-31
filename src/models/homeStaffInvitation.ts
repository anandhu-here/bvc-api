import mongoose, { Schema, model, Types } from "mongoose";
import crypto from "crypto";
import { IHomeStaffINvitiation } from "src/interfaces/entities/home-staff-invitation";

const HomeStaffInvitationSchema = new Schema<IHomeStaffINvitiation>(
  {
    senderId: { type: Schema.Types.ObjectId, required: true },
    receiverId: { type: String, required: true }, // Email address
    accountType: {
      type: String,
      enum: ["carer", "senior carer", "nurse", "guest", "agency"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      required: true,
      default: "pending",
    },
    companyName: { type: String, required: true },
    invToken: String,
    senderAccountType: String,
  },
  { timestamps: true } // This will automatically manage createdAt and updatedAt
);

// Method to generate invitation token
HomeStaffInvitationSchema.methods.generateToken =
  async function (): Promise<string> {
    const token = crypto.randomBytes(20).toString("hex");
    this.invToken = token;
    await this.save();
    return token;
  };

const HomeStaffInvitation = model<IHomeStaffINvitiation>(
  "HomeStaffInvitation",
  HomeStaffInvitationSchema
);

export default HomeStaffInvitation;
