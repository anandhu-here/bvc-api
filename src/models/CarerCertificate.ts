// CarerCertificate.ts
import mongoose, { Schema } from "mongoose";
import { ICarerCertificate } from "src/interfaces/entities/carer";

const CertificateSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
});

const CarerCertificateSchema = new Schema({
  carerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  certificates: [CertificateSchema],
});

export default mongoose.model<ICarerCertificate>(
  "CarerCertificate",
  CarerCertificateSchema
);
