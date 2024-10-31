import { Document, ObjectId, type Types } from "mongoose";
import { ITimesheet } from "./timesheet";
import type { IShiftPattern } from "./shift-pattern";
export interface IShift {
  _id: ObjectId;
  agentId?: ObjectId | string;
  homeId: ObjectId;
  isAccepted: boolean;
  isRejected: boolean;
  date: string;
  isCompleted: boolean;
  count: number;
  assignedUsers: Types.ObjectId[];
  privateKey?: string;
  signedCarers?: {
    [carerId: string]: string;
  };
  timesheet?: ITimesheet;
  shiftPattern: IShiftPattern;
  shiftPatternId: String;
  createdAt?: Date;
  updatedAt?: Date;
}
