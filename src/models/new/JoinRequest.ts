import mongoose, { Document, Schema } from "mongoose";

// Define an enum for request status
enum JoinRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// Define the interface for the join request document
interface IJoinRequest extends Document {
  user: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  status: JoinRequestStatus;
  requestDate: Date;
  responseDate?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  message?: string;
  role?: string;
  additionalInfo?: Record<string, any>;
}

// Create the schema
const joinRequestSchema = new Schema<IJoinRequest>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(JoinRequestStatus),
    default: JoinRequestStatus.PENDING,
    required: true,
  },
  requestDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  responseDate: {
    type: Date,
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    maxlength: 500,
  },
  role: {
    type: String,
  },
  additionalInfo: {
    type: Schema.Types.Mixed,
  },
});

// Add indexes
joinRequestSchema.index({ user: 1, organization: 1 }, { unique: true });
joinRequestSchema.index({ organization: 1, status: 1 });
joinRequestSchema.index({ requestDate: 1 });

// Add a static method to find pending requests for an organization
joinRequestSchema.statics.findPendingForOrganization = function (
  organizationId: mongoose.Types.ObjectId
) {
  return this.find({
    organization: organizationId,
    status: JoinRequestStatus.PENDING,
  });
};

// Create and export the model
const JoinRequest = mongoose.model<IJoinRequest>(
  "JoinRequest",
  joinRequestSchema
);

export { JoinRequest, IJoinRequest, JoinRequestStatus };
