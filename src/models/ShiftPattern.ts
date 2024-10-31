import { Schema, Types, model, Document } from "mongoose";

export interface IRate {
  careHomeId: string;
  userType: string; // Added userType field
  weekdayRate: number;
  weekendRate: number;
  holidayRate: number;
}

export interface UserTypeRate {
  userType: string;
  weekdayRate: number;
  weekendRate: number;
  holidayRate: number;
}

export interface IShiftType extends Document {
  name: string;
  rates: IRate[];
  userId: Types.ObjectId | string;
  userTypeRates: UserTypeRate[];
  timings: {
    startTime: string;
    endTime: string;
    careHomeId: string;
  }[];
}

export interface IHomeShiftType extends Document {
  userId: Types.ObjectId | string;
  shiftTypes: IShiftType[];
}

export interface IAgencyShiftType extends Document {
  userId: Types.ObjectId | string;
  shiftTypes: IShiftType[];
}

const RateSchema = new Schema<IRate>({
  careHomeId: { type: String, required: true },
  userType: { type: String, required: true }, // Added userType field
  weekdayRate: { type: Number, required: true },
  weekendRate: { type: Number, required: true },
  holidayRate: { type: Number, required: true },
});

const UserRateSchema = new Schema<UserTypeRate>({
  userType: { type: String, required: true },
  weekdayRate: { type: Number, required: true },
  weekendRate: { type: Number, required: true },
  holidayRate: { type: Number, required: true },
});

const HomeTimingsSchema = new Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  careHomeId: { type: String, required: true },
});

const ShiftTypeSchema = new Schema<IShiftType>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "Organization" },
  name: { type: String, required: true },
  rates: [RateSchema],
  userTypeRates: [UserRateSchema],
  timings: [HomeTimingsSchema],
});

const HomeShiftTypeSchema = new Schema<IHomeShiftType>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    shiftTypes: [ShiftTypeSchema],
  },
  { timestamps: true }
);

const AgencyShiftTypeSchema = new Schema<IAgencyShiftType>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "Agency" },
    shiftTypes: [ShiftTypeSchema],
  },
  { timestamps: true }
);

export const HomeShiftType = model<IHomeShiftType>(
  "HomeShiftType",
  HomeShiftTypeSchema
);
export const AgencyShiftType = model<IAgencyShiftType>(
  "AgencyShiftType",
  AgencyShiftTypeSchema
);
export const ShiftPattern = model<IShiftType>("ShiftPattern", ShiftTypeSchema);
