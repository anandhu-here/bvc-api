import { Document, ObjectId } from "mongoose";

export interface ITimelineItem {
  dateStarted: Date;
  dateEnded: Date;
  companyId: ObjectId;
  description: string;
  designation: string;
  finalReview?: string;
  finalRating?: number;
}

export interface ITimeline extends Document {
  carerId: ObjectId;
  currentCompany: ObjectId;
  timeline: ITimelineItem[];
  currentDesignation: string;
}
