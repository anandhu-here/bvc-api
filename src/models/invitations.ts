import mongoose, { Schema } from "mongoose";
import { IJoinInvitation } from "src/interfaces/entities/invitations";
import jwt from "jsonwebtoken";
import Logger from "src/logger";

const JoinInvitationSchema = new Schema<IJoinInvitation>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderAccountType: { type: String, required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    invToken: { type: String },
    companyName: { type: String, required: true },
  },
  { timestamps: true }
);

JoinInvitationSchema.pre<IJoinInvitation>("save", function (next) {
  if (!this.invToken) {
    this.generateToken();
  }
  next();
});

JoinInvitationSchema.methods.generateToken = function () {
  const payload = {
    senderId: this.senderId,
    receiverId: this.receiverId,
  };

  const options = {
    expiresIn: "1h",
  };
  this.invToken = jwt.sign(payload, process.env.JWT_SECRET, options);
  Logger.warn("token: ", this.invToken);
  return this.invToken;
};

export default mongoose.model<IJoinInvitation>(
  "JoinInvitation",
  JoinInvitationSchema
);
