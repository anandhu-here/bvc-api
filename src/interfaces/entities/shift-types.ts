import type { Document, ObjectId, Types } from "mongoose";

export interface IShiftType extends Document {
  name: string;
  startTime: string;
  endTime: string;
  hourlyPay: number;
}

export interface IUserShiftType {
  userId: ObjectId | string;
  shifttypes: IShiftType[];
}

export interface IUserShiftTypeModel extends IUserShiftType, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRestructuredShift {
  _id: Types.ObjectId;
  agentId: {
    _id: Types.ObjectId;
    company: {
      name: string;
      address: string;
      isPrivate: boolean;
      _id: Types.ObjectId;
    };
  };
  homeId: {
    _id: Types.ObjectId;
    company: {
      name: string;
      address: string;
      isPrivate: boolean;
      _id: Types.ObjectId;
    };
  };
  isAccepted: boolean;
  isRejected: boolean;
  isCompleted: boolean;
  count: number;
  date: string;
  assignedUsers: any[]; // You might want to define a more specific type here
  shiftTypeRef: string;
  shiftType: {
    name: string;
    startTime: string;
    endTime: string;
    rates: {
      careHomeId: string;
      weekdayRate: number;
      weekendRate: number;
      _id: Types.ObjectId;
    }[];
    _id: Types.ObjectId;
  };
  shiftTypeModel: string;
  createdAt: Date;
  updatedAt: Date;
}
