import mongoose, { Schema } from "mongoose";
import {
  IAnnualLeaveModel,
  IAnnualLeaveModelStatic,
} from "../interfaces/entities/user";

const AnnualLeaveSchema = new Schema<IAnnualLeaveModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// AnnualLeaveSchema.statics.build = (attrs: IAnnualLeaveRequest) => {
//   return new AnnualLeave(attrs);
// };

const AnnualLeave = mongoose.model<IAnnualLeaveModel, IAnnualLeaveModelStatic>(
  "AnnualLeave",
  AnnualLeaveSchema
);

export default AnnualLeave;
