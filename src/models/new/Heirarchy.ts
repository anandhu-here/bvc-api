import mongoose, { Schema, Document, Model, Types } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Interfaces

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IUser extends Document {
  avatarUrl: string;
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string; // Changed to string to allow more diverse roles
  address: IAddress;
  emailVerified: boolean;
  emailVerificationToken: string;
  emailVerificationTokenExpires: Date;
  phone: string;
  countryCode: string;
  organizationRoles: Types.ObjectId[];
  passwordResetCode: string;
  passwordResetExpires: Date;
  accountDeletionRequested: boolean;
  accountDeletionRequestedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

export interface IOrganization extends Document {
  logoUrl?: string;
  avatarUrl?: string;
  _id: Types.ObjectId;
  name: string;
  type: "agency" | "home";
  address: IAddress;
  phone: string;
  countryCode: string;
  email: string;
  admin: Types.ObjectId;
  parentCompany?: Types.ObjectId;
  staff: Types.ObjectId[];
  linkedOrganizations: Types.ObjectId[]; // New field for linked organizations
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialStart?: Date;
  trialEnd?: Date;
  isInTrialPeriod?: boolean;
  subscriptionPlan?: any;
  planId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  subscriptionStatus?:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete";
}

export interface IParentCompany extends Document {
  name: string;
  address: IAddress;
  phone: string;
  email: string;
  organizations: Types.ObjectId[];
}

export interface IOrganizationRole extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  organization: Types.ObjectId;
  role: string; // Changed to string to allow more diverse roles
  permissions: string[];
  staffType: "care" | "admin" | "other";
}

// Schemas

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    avatarUrl: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    address: AddressSchema,
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
    phone: { type: String, required: true },
    countryCode: { type: String, required: true },
    organizationRoles: [
      { type: Schema.Types.ObjectId, ref: "OrganizationRole" },
    ],
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
    accountDeletionRequested: { type: Boolean, default: false },
    accountDeletionRequestedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ lastName: 1, firstName: 1 });

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function (): string {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });
};

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["agency", "home"], required: true },
    address: AddressSchema,
    phone: { type: String, required: true },
    countryCode: { type: String, required: true },
    email: { type: String, required: true },
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentCompany: { type: Schema.Types.ObjectId, ref: "ParentCompany" },
    staff: [{ type: Schema.Types.ObjectId, ref: "User" }],
    linkedOrganizations: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    avatarUrl: { type: String },
    logoUrl: { type: String },
    trialStart: { type: Date },
    trialEnd: { type: Date },
    isInTrialPeriod: { type: Boolean, default: false },
    subscriptionPlan: { type: String },
    planId: { type: String }, // To store the Stripe Price ID of the current plan
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    lastPaymentDate: { type: Date },
    nextPaymentDate: { type: Date },
    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "inactive",
      ],
      default: "trialing",
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ type: 1 });
OrganizationSchema.index({ owner: 1 });
OrganizationSchema.index({ parentCompany: 1 });
OrganizationSchema.index({ "address.city": 1, "address.state": 1 });

const ParentCompanySchema = new Schema<IParentCompany>(
  {
    name: { type: String, required: true },
    address: AddressSchema,
    phone: { type: String, required: true },
    email: { type: String, required: true },
    organizations: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
  },
  { timestamps: true }
);

ParentCompanySchema.index({ name: 1 });
ParentCompanySchema.index({ email: 1 });

const OrganizationRoleSchema = new Schema<IOrganizationRole>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: { type: String, required: true },
    permissions: [String],
    staffType: {
      type: String,
      enum: ["care", "admin", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

OrganizationRoleSchema.index({ user: 1, organization: 1 }, { unique: true });
OrganizationRoleSchema.index({ organization: 1, role: 1 });

// Models

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
const ParentCompany: Model<IParentCompany> = mongoose.model<IParentCompany>(
  "ParentCompany",
  ParentCompanySchema
);
const OrganizationRole: Model<IOrganizationRole> =
  mongoose.model<IOrganizationRole>("OrganizationRole", OrganizationRoleSchema);

export { User, Organization, ParentCompany, OrganizationRole };
