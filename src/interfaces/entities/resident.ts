import { Document, Types } from "mongoose";

export interface IResident extends Document {
  homeId: Types.ObjectId;
  firstName: string;
  lastName: string;
  roomNumber: string;
  profilePictureUrl: string;
  type: string;
  careTimeline: ICareTimelineEntry[];
  medicationsTimeline: IMedicationTimelineEntry[];
  personalCare: IPersonalCare;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICareTimelineEntry {
  carerId: Types.ObjectId;
  careType: string;
  details: any; // This will contain the personal care details
  time: Date;
}

export interface IMedicationTimelineEntry {
  medicationId: Types.ObjectId;
  nurseId: Types.ObjectId;
  time: Date;
}

export interface IPersonalCare {
  shower: IPersonalCareItem;
  bath: IPersonalCareItem;
  breakfast: IMealCareItem;
  lunch: IMealCareItem;
  dinner: IMealCareItem;
  snacks: IPersonalCareItem;
  padCheck: IPersonalCareItem;
  fluidIntake: IPersonalCareItem;
  sleep: IPersonalCareItem;
}

export interface IPersonalCareItem {
  frequency: {
    times: number;
    per: "day" | "week" | "night";
  };
}

export interface IMealCareItem extends IPersonalCareItem {
  defaultTime: string; // HH:mm format
}

export interface IMedication {
  type: string;
  frequency: {
    times: number;
    per: "day" | "week" | "night";
  };
  label: string;
  medicineName: string;
  timings: string[]; // Array of HH:mm format strings
}
