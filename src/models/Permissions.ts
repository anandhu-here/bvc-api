import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description: string;
}

const PermissionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

PermissionSchema.index({ name: 1 });

const Permission: Model<IPermission> = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema
);

export default Permission;
