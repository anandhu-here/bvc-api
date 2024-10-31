import mongoose, { Schema } from "mongoose";
import type { IOrgInvitation } from "src/interfaces/entities/org-invitation";
const IOrgInvitationSchema = new Schema<IOrgInvitation>({
  fromOrganization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  toOrganization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  type: {
    type: String,
    enum: ["linkOrganization", "joinOrganization"],
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  role: { type: String }, // Optional field for join invitations
  message: { type: String }, // Optional message from the inviting organization
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const OrgInvitation = mongoose.model<IOrgInvitation>(
  "OrgInvitation",
  IOrgInvitationSchema
);

export default OrgInvitation;
