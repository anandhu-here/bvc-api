import mongoose, { Schema, model, Types } from "mongoose";
import crypto from "crypto";
import { IInvitation } from "src/interfaces/entities/invitation";

const InvitationSchema = new Schema<IInvitation>(
  {
    senderId: { type: Schema.Types.ObjectId, required: true },
    receiverId: { type: String, required: true }, // Email address
    accountType: {
      type: String,
      enum: [
        "carer",
        "agency",
        "nurse",
        "home",
        "admin",
        "superadmin",
        "user",
        "guest",
        "unknown",
      ],
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
  { timestamps: true }
);

InvitationSchema.methods.generateToken = async function (): Promise<string> {
  const token = crypto.randomBytes(20).toString("hex");
  this.invToken = token;
  await this.save();
  return token;
};

const Invitation = model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;
