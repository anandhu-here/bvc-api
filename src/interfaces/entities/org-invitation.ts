import { Document, Types } from "mongoose";

export interface IOrgInvitation extends Document {
  fromOrganization: Types.ObjectId;
  toOrganization: Types.ObjectId;
  type?: "linkOrganization" | "joinOrganization";
  status: "pending" | "accepted" | "rejected";
  role?: string; // Optional field for join invitations
  message?: string; // Optional message from the inviting organization
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrgInvitationPopulated
  extends Omit<IOrgInvitation, "fromOrganization" | "toOrganization"> {
  fromOrganization: {
    _id: Types.ObjectId;
    name: string;
    // Add other relevant fields from the Organization model
  };
  toOrganization: {
    _id: Types.ObjectId;
    name: string;
    // Add other relevant fields from the Organization model
  };
}
