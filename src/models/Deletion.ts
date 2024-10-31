import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDeletionRequest extends Document {
  entityType: "user" | "organization";
  entityId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  scheduledDeletionDate: Date;
  status: "pending" | "cancelled" | "completed";
  reason?: string;
}

const DeletionRequestSchema = new Schema<IDeletionRequest>({
  entityType: { type: String, enum: ["user", "organization"], required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  requestedAt: { type: Date, default: Date.now },
  scheduledDeletionDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "cancelled", "completed"],
    default: "pending",
  },
  reason: { type: String },
});

export const DeletionRequest = mongoose.model<IDeletionRequest>(
  "DeletionRequest",
  DeletionRequestSchema
);
