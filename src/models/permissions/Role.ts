import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[]; // Array of permission codes
  priority: number;
}

const RoleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: String, ref: "Permission" }],
  priority: { type: Number, required: true, default: 0 },
});

export const Role = mongoose.model<IRole>("Role", RoleSchema);
