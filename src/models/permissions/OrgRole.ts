import mongoose, { Schema, Document } from "mongoose";

export interface IOrganizationRole extends Document {
  user: string;
  organization: string;
  role: string;
  customPermissions: string[]; // For any additional permissions not in the role
}

const OrganizationRoleSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
  customPermissions: [{ type: String, ref: "Permission" }],
});

export const OrganizationRole = mongoose.model<IOrganizationRole>(
  "OrgRole",
  OrganizationRoleSchema
);
