import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Interface
export interface IFCMToken extends Document {
  user: Types.ObjectId;
  token: string;
  device: {
    type: "ios" | "android" | "web";
    model?: string;
    osVersion?: string;
    appVersion?: string;
    identifier?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const FCMTokenSchema = new Schema<IFCMToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    device: {
      type: {
        type: String,
        enum: ["ios", "android", "web"],
        required: true,
      },
      model: String,
      osVersion: String,
      appVersion: String,
      identifier: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Updated index
FCMTokenSchema.index({ user: 1, "device.identifier": 1 }, { unique: true });
FCMTokenSchema.index({ token: 1 });
FCMTokenSchema.index({ user: 1 });
FCMTokenSchema.index({ "device.type": 1 });

// Model
const FCMToken: Model<IFCMToken> = mongoose.model<IFCMToken>(
  "FCMToken",
  FCMTokenSchema
);

export { FCMToken };
