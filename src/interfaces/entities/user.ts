import { Document, Model, Types } from "mongoose";

// Basic interfaces
export interface IAvatar {
  publicId: string;
  url: string;
}

export interface IAvailableTimings {
  dates: string[];
}

export interface IFcmToken {
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnualLeaveConfig {
  staffType: "carer" | "nurse" | "other";
  daysPerYear: number;
}

export interface IAccountVerification {
  isVerified: boolean;
  category: string;
  verifiedAt: Date;
  lastRequestedAt?: Date;
}

// Company interface
export interface ICompany {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  isPrivate?: boolean;
}

// Payment related interfaces
export interface IPayment {
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  paymentMethod: string;
  paymentDate: Date;
  description?: string;
}

export interface IPaymentModel extends IPayment, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Annual Leave interfaces
export interface IAnnualLeave {
  userId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: "pending" | "approved" | "rejected";
  approvedBy?: Types.ObjectId;
}

export interface IAnnualLeaveModel extends IAnnualLeave, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnualLeaveModelStatic extends Model<IAnnualLeaveModel> {
  build(attrs: IAnnualLeave): IAnnualLeaveModel;
}

// Main User interface
export interface IUser {
  fname: string;
  lname: string;
  nameChangedAt?: Date;
  email: string;
  isEmailVerified: boolean;
  emailChangedAt?: Date;
  emailVerificationToken?: string;
  countryCode: string;
  phone: string;
  isPhoneVerified: boolean;
  phoneChangedAt?: Date;
  accountType:
    | "carer"
    | "agency"
    | "nurse"
    | "home"
    | "admin"
    | "superadmin"
    | "user"
    | "guest"
    | "unknown";
  company?: ICompany;
  availabilities: IAvailableTimings;
  isAgencyStaff: boolean;
  isHomeStaff: boolean;
  avatar?: IAvatar;
  website?: string;
  isPrivate?: boolean;
  accountStatus: string;
  verification?: IAccountVerification;
  fcmTokens: IFcmToken[];
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  activeSubscription?: Types.ObjectId;
  paymentHistory: Types.ObjectId[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  annualLeaveConfig: IAnnualLeaveConfig[];
  annualLeaveRequests: Types.ObjectId[];
  annualLeaveBalance: number;
  usedLeaveDays: number;
}

// User Model interface
export interface IUserModel extends IUser, Document {
  password?: string;
  passwordChangedAt?: Date;
  salt: string;

  postsCount?: number;
  followersCount?: number;
  followingCount?: number;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  generateToken(): Promise<IAuthToken>;
  getToken(refreshToken?: boolean): Promise<IAuthToken>;
  isProfileComplete(): Promise<boolean>;
  setPassword(password: string): Promise<void>;
  matchPassword(password: string): Promise<boolean>;
  getActiveSubscription(): Promise<IPaymentModel | null>;
  getPaymentHistory(): Promise<IPaymentModel[]>;
  updateSubscription(paymentId: Types.ObjectId): Promise<void>;
}

// Auth Token interface
export interface IAuthToken {
  token: string;
  userId: Types.ObjectId;
  expiresAt: number;
}

export interface IAuthTokenModel extends IAuthToken, Document {
  createdAt: Date;
  updatedAt: Date;
}

// User Relationship interface
export interface IUserRelationship {
  userId: Types.ObjectId;
  relatedUserId: Types.ObjectId;
  relationshipType: "agency" | "home" | "carer" | "nurse" | "admin";
}

export interface IUserRelationshipModel extends IUserRelationship, Document {
  createdAt: Date;
  updatedAt: Date;
}
