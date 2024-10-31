import mongoose, { Schema, Types, model, Model } from "mongoose";

interface IUserRelationship {
  userId: Types.ObjectId;
  relatedUserId: Types.ObjectId;
  relationshipType: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserRelationshipSchema = new Schema<IUserRelationship>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    relationshipType: {
      type: String,
      enum: ["agency", "home", "carer", "nurse", "admin"],
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of relationships
UserRelationshipSchema.index({ userId: 1, relatedUserId: 1 }, { unique: true });

// Index for efficient querying
UserRelationshipSchema.index({ userId: 1, relationshipType: 1 });
UserRelationshipSchema.index({ relatedUserId: 1, relationshipType: 1 });

const UserRelationship: Model<IUserRelationship> =
  mongoose.models.UserRelationship ||
  model<IUserRelationship>("UserRelationship", UserRelationshipSchema);

export default UserRelationship;
