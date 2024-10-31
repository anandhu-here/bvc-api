import { Document, Types } from "mongoose";

export interface ICarerDoc extends Document {
  carerId: Types.ObjectId;
  documents: IDocument[];
  shareCode: string;
  niNumber: string;
}

export interface ICarerCertificate extends Document {
  carerId: Types.ObjectId;
  certificates: ICertificate[];
}

export interface IDocument {
  name: string;
  url: string;
  type: string;
  uploadDate: Date;
}

export interface ICertificate {
  name: string;
  url: string;
  type: string;
  uploadDate: Date;
  expiryDate?: Date;
}
