import { Document, Model, Types } from "mongoose";
import { IUserModel } from "./user"; // Assuming you have a user interface defined
import type { IOrganization } from "src/models/new/Heirarchy";

export interface IMessage {
  sender: Types.ObjectId | IUserModel;
  receiver: Types.ObjectId | IUserModel;
  content: string;
  chatId: string;
  readBy: Types.ObjectId[] | IUserModel[];
  attachments?: string[];
  messageType: "text" | "image" | "file" | "system";
  isGlobal?: boolean;
  recipients?: Types.ObjectId[] | IUserModel[];
  homeId?: Types.ObjectId | IUserModel;
  orgId?: Types.ObjectId | IOrganization;
}

export interface IMessageMethods {
  markAsRead(userId: Types.ObjectId): Promise<void>;
}

export interface IMessageModel extends IMessage, IMessageMethods, Document {
  createdAt: Date;
  updatedAt: Date;
  isRead: boolean;
}

export interface IMessageModelStatic extends Model<IMessageModel> {
  getChatHistory(
    chatId: string,
    limit?: number,
    before?: Date | null,
    orgId?: Types.ObjectId
  ): Promise<IMessageModel[]>;
  getGlobalChatHistory(
    homeId: Types.ObjectId,
    limit?: number,
    before?: Date | null,
    orgId?: Types.ObjectId
  ): Promise<IMessageModel[]>;
}
