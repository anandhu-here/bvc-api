import mongoose, { Schema, Document } from "mongoose";

const TaskStatusSchema = new Schema({
  isDue: { type: Boolean, default: false },
  lastDueTime: Date,
  lastResolvedTime: Date,
  lastResolvedDescription: String,
});

const TaskSchema = new Schema({
  frequency: {
    times: Number,
    per: { type: String, enum: ["day", "week", "night"] },
  },
  timings: [String],
  statuses: [TaskStatusSchema],
});

const MedicationSchema = new Schema({
  name: String,
  dosage: String,
  ...TaskSchema.obj,
});

const PersonalCareSchema = new Schema({
  shower: TaskSchema,
  bath: TaskSchema,
  breakfast: TaskSchema,
  lunch: TaskSchema,
  dinner: TaskSchema,
  snacks: TaskSchema,
  padCheck: TaskSchema,
  fluidIntake: TaskSchema,
  sleep: TaskSchema,
  dayCheck: TaskSchema,
  nightCheck: TaskSchema,
});

const ResidentSchema = new Schema(
  {
    homeId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    profilePictureUrl: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    type: {
      type: String,
      enum: ["Permanent", "Temporary", "Respite"],
      required: true,
    },
    medications: [MedicationSchema],
    personalCare: PersonalCareSchema,
    currentStatus: { type: Number, default: 0 },
    lastTaskCheck: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export interface IResident extends Document {
  homeId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  roomNumber: string;
  groupId?: mongoose.Types.ObjectId;
  profilePictureUrl?: string;
  type: "Permanent" | "Temporary" | "Respite";
  medications: Array<any>;
  personalCare: {
    [key: string]: {
      frequency: {
        times: number;
        per: "day" | "week" | "night";
      };
      timings: string[];
      statuses: Array<{
        isDue: boolean;
        lastDueTime?: Date;
        lastResolvedTime?: Date;
        lastResolvedDescription?: string;
      }>;
    };
  };
  currentStatus: number;
  lastTaskCheck: Date;
}

export default mongoose.model<IResident>("TResidents", ResidentSchema);
