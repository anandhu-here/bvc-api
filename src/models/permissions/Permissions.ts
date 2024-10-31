import mongoose, { Schema, Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description: string;
  code: string;
}

const PermissionSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  code: { type: String, required: true, unique: true },
});

export const Permission = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema
);
