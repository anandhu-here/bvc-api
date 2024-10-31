import { Types } from "mongoose";

export interface IRate {
  careHomeId: string;
  weekdayRate: number;
  weekendRate: number;
}

export interface UserTypeRate {
  userType: string;
  weekdayRate: number;
  weekendRate: number;
  holidayRate: number;
}

export interface IShiftpatternTimings {
  startTime: string;
  endTime: string;
  careHomeId: string;
}

export interface IShiftPattern {
  _id?: Types.ObjectId;
  name: string;
  rates: IRate[];
  userId: Types.ObjectId;
  userTypeRates: UserTypeRate[];
  timings: IShiftpatternTimings[];
}
