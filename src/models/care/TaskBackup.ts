import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITaskData {
  [key: string]: any;
}

export interface ITaskFrequency {
  type: "frequent" | "daily" | "weekly" | "monthly" | "one-time";
  interval?: number; // in minutes, for "frequent" tasks
  timeOfDay?: string; // for daily, weekly, monthly tasks
}

export interface ITask extends Document {
  orgId: Types.ObjectId;
  resident: Types.ObjectId;
  taskName: string;
  description: string;
  taskType: string;
  frequency: ITaskFrequency;
  dueDate: Date;
  nextOccurrence: Date;
  completedDate?: Date;
  completedBy?: Types.ObjectId;
  status: "upcoming" | "pending" | "completed" | "overdue" | "missed" | "idle";
  notes?: string;
  taskData: ITaskData;
}

const TaskFrequencySchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ["frequent", "daily", "weekly", "monthly"],
      required: true,
    },
    interval: {
      type: Number,
      required: function (this: ITaskFrequency) {
        return this.type === "frequent";
      },
    },
    timeOfDay: {
      type: String,
      required: function (this: ITaskFrequency) {
        return ["daily", "weekly", "monthly"].includes(this.type);
      },
      validate: {
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid time format (HH:mm)!`,
      },
    },
  },
  { _id: false }
);

const TaskSchema: Schema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  resident: {
    type: Schema.Types.ObjectId,
    ref: "Resident",
    required: true,
  },
  taskName: { type: String, required: true },
  description: { type: String },
  taskType: { type: String, required: true },
  frequency: { type: TaskFrequencySchema, required: true },
  dueDate: { type: Date, required: true },
  nextOccurrence: { type: Date, required: true },
  completedDate: Date,
  completedBy: { type: Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["upcoming", "pending", "completed", "overdue", "missed", "idle"],
    default: "upcoming",
  },
  notes: String,
  taskData: { type: Schema.Types.Mixed, default: {} },
});

// Add indexes
TaskSchema.index({ resident: 1, status: 1, dueDate: 1 });
TaskSchema.index({ resident: 1, taskType: 1, completedDate: 1 });
TaskSchema.index({ orgId: 1, status: 1, dueDate: 1 });

export const TaskBakup = mongoose.model<ITask>("TaskBackup", TaskSchema);
