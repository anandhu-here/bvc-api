// models/Invites.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IOrganizationInvitation extends Document {
  organization: mongoose.Types.ObjectId;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  invitedBy: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}

const OrganizationInvitationSchema = new Schema<IOrganizationInvitation>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acceptedAt: Date,
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Indexes
OrganizationInvitationSchema.index({ token: 1 });
OrganizationInvitationSchema.index(
  { email: 1, organization: 1 },
  { unique: true }
);
OrganizationInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrganizationInvitations = mongoose.model<IOrganizationInvitation>(
  "OrganizationInvitation",
  OrganizationInvitationSchema
);

export default OrganizationInvitations;
