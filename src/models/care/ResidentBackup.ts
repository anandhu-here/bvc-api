import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITaskSummary {
  upcoming: number;
  pending: number;
  overdue: number;
  total: number;
  urgency: "white" | "green" | "amber" | "red";
}

export interface IResident extends Document {
  orgId: Types.ObjectId;
  groupId: Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  roomNumber: string;
  admissionDate: Date;
  medicalConditions: string[];
  allergies: string[];
  group: string | null;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  tasks: Types.ObjectId[];
  taskSummary: ITaskSummary;
  profilePictureUrl?: string;
  carePlan: mongoose.Types.ObjectId;
}

const TaskSummarySchema: Schema = new Schema(
  {
    upcoming: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    urgency: {
      type: String,
      enum: ["white", "green", "amber", "red"],
      default: "white",
    },
  },
  { _id: false }
);

const ResidentSchema: Schema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: false },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  roomNumber: { type: String, required: true },
  admissionDate: { type: Date, required: true },
  medicalConditions: [String],
  group: { type: String, required: false },
  allergies: [String],
  emergencyContact: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
  },
  tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  taskSummary: { type: TaskSummarySchema, default: () => ({}) },
  profilePictureUrl: {
    type: String,
    default: "https://via.placeholder.com/150",
  },
  carePlan: { type: Schema.Types.ObjectId, ref: "CarePlan" },
});

// Add indexes
ResidentSchema.index({ firstName: 1, lastName: 1 });
ResidentSchema.index({ roomNumber: 1 });
ResidentSchema.index({ group: 1 });

export const ResidentBackup = mongoose.model<IResident>(
  "ResidentBackup",
  ResidentSchema
);
