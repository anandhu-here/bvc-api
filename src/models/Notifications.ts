import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Interface
export interface INotificationHistory extends Document {
  organization: Types.ObjectId;
  type: string;
  priority: "low" | "medium" | "high";
  title: string;
  content: string;
  metadata: {
    actionType?: string;
    actionId?: string;
    [key: string]: any;
  };
  recipients: {
    roles?: string[];
    users?: Types.ObjectId[];
    everyone?: boolean;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  expiresAt?: Date;
  status: "pending" | "sent" | "failed";
  error?: string;
  readBy: {
    userId: Types.ObjectId;
    readAt: Date;
  }[];
}

// Schema
const NotificationHistorySchema = new Schema<INotificationHistory>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    type: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    metadata: {
      actionType: String,
      actionId: String,
    },
    recipients: {
      roles: [String],
      users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      everyone: { type: Boolean, default: false },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: { type: String },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
NotificationHistorySchema.index({ organization: 1, createdAt: -1 });
NotificationHistorySchema.index({ organization: 1, type: 1 });
NotificationHistorySchema.index({ organization: 1, status: 1 });
NotificationHistorySchema.index({ "recipients.roles": 1 });
NotificationHistorySchema.index({ "recipients.users": 1 });
NotificationHistorySchema.index({ "readBy.userId": 1 });

// Model
const NotificationHistory: Model<INotificationHistory> =
  mongoose.model<INotificationHistory>(
    "NotificationHistory",
    NotificationHistorySchema
  );

export { NotificationHistory };
