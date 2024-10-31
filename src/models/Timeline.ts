import { Schema, model, Types } from "mongoose";
import { ITimeline, ITimelineItem } from "../interfaces/entities/timeline";

const TimelineItemSchema = new Schema<ITimelineItem>({
  dateStarted: {
    type: Date,
    required: false,
  },
  dateEnded: {
    type: Date,
    required: false,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  designation: {
    type: String,
    required: false,
  },
  finalReview: {
    type: String,
    required: false,
  },
  finalRating: {
    type: Number,
    required: false,
  },
});

const TimelineSchema = new Schema<ITimeline>(
  {
    carerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    currentCompany: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    timeline: {
      type: [TimelineItemSchema],
      default: [],
    },
    currentDesignation: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: false,
  }
);

const TimelineModel = model<ITimeline>("Timeline", TimelineSchema);

export default TimelineModel;
