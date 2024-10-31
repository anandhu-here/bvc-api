import mongoose, { Schema, model, Types, Model } from "mongoose";
import type { IAuthTokenModel } from "../interfaces/entities/authToken";

const AuthTokenSchema = new Schema<IAuthTokenModel>(
  {
    token: {
      type: String,
      required: true,
    },
    userId: {
      type: Types.ObjectId,
      required: true,
    },
    expiresAt: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/**
 * @name isExpired
 * @description Check if auth token is expired
 * @returns Promise<boolean>
 */
AuthTokenSchema.methods.isExpired = async function (): Promise<boolean> {
  return this.expiresAt < Date.now() / 1000;
};

// Check if the model already exists before creating a new one
const AuthToken: Model<IAuthTokenModel> =
  mongoose.models.AuthToken ||
  model<IAuthTokenModel>("AuthToken", AuthTokenSchema);

export default AuthToken;
