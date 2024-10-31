import { Document, Schema, model, Types } from "mongoose";
import type { ITimesheet } from "src/interfaces/entities/timesheet";

// IRate interface
export interface IRate {
  careHomeId: string;
  weekdayRate: number;
  weekendRate: number;
}

// IShiftPattern interface
export interface IShiftPattern {
  _id: Types.ObjectId;
  name: string;
  startTime: string;
  endTime: string;
  rates: IRate[];
  userId: Types.ObjectId;
}

// Updated IShift interface
export interface IShift extends Document {
  _id: Types.ObjectId;
  agentId?: Types.ObjectId | string;
  homeId: Types.ObjectId;
  isAccepted: boolean;
  isRejected: boolean;
  isDone: boolean;
  date: string;
  isCompleted: boolean;
  count: number;
  assignedUsers: Types.ObjectId[];
  privateKey?: string;
  signedCarers?: {
    [carerId: string]: string;
  };
  timesheet?: ITimesheet;
  shiftPattern: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  agencyAccepted: boolean;
  qrCodeToken?: string;
  qrCodeTokenExpiry?: Date;
  qrCodeTokenUserId?: Types.ObjectId; // New field to store the user ID associated with the QR code
}

// Updated ShiftSchema
export const ShiftSchema: Schema<IShift> = new Schema<IShift>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
    },
    homeId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    count: {
      type: Number,
      default: 0,
    },
    date: {
      type: String,
      required: true,
    },
    assignedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    privateKey: {
      type: String,
      required: false,
    },
    signedCarers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    shiftPattern: {
      type: Schema.Types.ObjectId,
      ref: "ShiftPattern",
    },
    agencyAccepted: {
      type: Boolean,
      default: false,
    },
    qrCodeToken: {
      type: String,
      required: false,
    },
    qrCodeTokenExpiry: {
      type: Date,
      required: false,
    },
    qrCodeTokenUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Existing indexes
ShiftSchema.index({ homeId: 1, date: 1 });
ShiftSchema.index({ agentId: 1, isAccepted: 1, isRejected: 1 });
ShiftSchema.index({ assignedUsers: 1, date: 1 });
ShiftSchema.index({ date: 1, status: 1 });

// New index for QR code token
ShiftSchema.index({ qrCodeToken: 1 });
ShiftSchema.index({ qrCodeTokenUserId: 1 });

const ShiftModel = model<IShift>("Shift", ShiftSchema);

export default ShiftModel;
