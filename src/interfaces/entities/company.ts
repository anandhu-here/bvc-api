import { Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  isPrivate?: boolean;
}
