import mongoose from "mongoose";
import { Schema } from "mongoose";

const GroupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    homeId: { type: Schema.Types.ObjectId, ref: "Home", required: true },
    residents: [{ type: Schema.Types.ObjectId, ref: "Resident" }],
  },
  { timestamps: true }
);

export interface IGroup extends Document {
  name: string;
  description?: string;
  homeId: mongoose.Types.ObjectId;
  residents: mongoose.Types.ObjectId[];
}

export default mongoose.model<IGroup>("Group", GroupSchema);
