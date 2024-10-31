import mongoose, { Schema, Types, model, Model } from "mongoose";
import type {
  IMessageModel,
  IMessageModelStatic,
} from "../interfaces/entities/message"; // Adjust the import path as necessary

const MessageSchema = new Schema<IMessageModel>(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, "Message content should not exceed 5000 characters"],
    },
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    readBy: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    recipients: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    homeId: {
      type: Types.ObjectId,
      ref: "User",
    },
    orgId: {
      type: Types.ObjectId,
      ref: "Organization",
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ orgId: 1, createdAt: -1 });

// Virtual for checking if the message is read
MessageSchema.virtual("isRead").get(function () {
  return this.readBy.length > 0;
});

// Method to mark message as read
MessageSchema.methods.markAsRead = async function (userId: Types.ObjectId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
    await this.save();
  }
};

// Static method to get chat history
MessageSchema.statics.getChatHistory = async function (
  this: IMessageModelStatic,
  chatId: string,
  limit: number = 50,
  before: Date | null = null,
  orgId?: Types.ObjectId
) {
  let query = this.find({ chatId });

  if (orgId) {
    query = query.where("orgId").equals(orgId);
  }

  if (before) {
    query = query.where("createdAt").lt(before as any);
  }

  return query
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "fname lname avatar")
    .populate("receiver", "fname lname avatar");
};

MessageSchema.statics.getGlobalChatHistory = async function (
  homeId: Types.ObjectId,
  limit: number = 50,
  before: Date | null = null,
  orgId?: Types.ObjectId
) {
  let query = this.find({ homeId, isGlobal: true });

  if (orgId) {
    query = query.where("orgId").equals(orgId);
  }

  if (before) {
    query = query.where("createdAt").lt(before);
  }

  return query
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "fname lname avatar accountType")
    .populate("homeId", "fname lname avatar");
};

const Message = model<IMessageModel, IMessageModelStatic>(
  "Message",
  MessageSchema
);

export default Message;
