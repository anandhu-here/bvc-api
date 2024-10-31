import mongoose, { Schema, Types, model, Model, Document } from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { EUserStatus } from "../enums";
import LocalConfig from "../configs/LocalConfig";
import StringValues from "../constants/strings";
import Logger from "../logger";
import AuthToken from "./AuthToken";
import TokenServiceHelper from "../helpers/TokenServiceHelper";
import Payment from "./Payments";

// Interfaces
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

export interface ICompany {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  isPrivate: boolean;
}

export interface IPayment extends Document {
  userId: Schema.Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  paymentMethod: string;
  paymentDate: Date;
  description?: string;
}

export interface IAuthToken extends Document {
  token: string;
  userId: Types.ObjectId;
  expiresAt: number;
}

export interface IUser {
  fname: string;
  lname: string;
  nameChangedAt?: Date;
  email: string;
  isEmailVerified: boolean;
  emailChangedAt?: Date;
  emailVerificationToken?: string;
  countryCode?: string;
  phone?: string;
  isPhoneVerified: boolean;
  phoneChangedAt?: Date;
  accountType:
    | "carer"
    | "nurse"
    | "senior-carer"
    | "agency"
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
  isPrivate: boolean;
  accountStatus: EUserStatus;
  verification?: IAccountVerification;
  fcmTokens: IFcmToken[];
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  activeSubscription?: Types.ObjectId;
  paymentHistory: Types.ObjectId[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  annualLeaveConfig: IAnnualLeaveConfig[];
  usedLeaveDays: number;
  password?: string;
  passwordChangedAt?: Date;
  salt: string;
}

export interface IUserModel extends IUser, Document {
  _id: Types.ObjectId;
  fullName: string;
  generateToken(): Promise<IAuthToken>;
  getToken(refreshToken?: boolean): Promise<IAuthToken>;
  checkToken(token: string): Promise<string>;
  isProfileComplete(): Promise<boolean>;
  setPassword(password: string): Promise<void>;
  matchPassword(password: string): Promise<boolean>;
  getActiveSubscription(): Promise<IPayment | null>;
  getPaymentHistory(): Promise<IPayment[]>;
  updateSubscription(paymentId: Types.ObjectId): Promise<void>;
}

// Schemas
const AvailableTimingsSchema = new Schema<IAvailableTimings>({
  dates: [String],
});

const AnnualLeaveConfigSchema = new Schema<IAnnualLeaveConfig>({
  staffType: {
    type: String,
    enum: ["carer", "nurse", "other"],
    required: true,
  },
  daysPerYear: {
    type: Number,
    required: true,
    min: 0,
  },
});

const companySchema = new Schema<ICompany>({
  name: {
    type: String,
    required: true,
    maxlength: [
      100,
      "Company name length should not be greater than 100 characters",
    ],
  },
  address: {
    type: String,
    required: true,
    maxlength: [
      100,
      "Company address length should not be greater than 100 characters",
    ],
  },
  phone: {
    type: String,
    validate: {
      validator: (v: string) => v.length === 10,
      message: "Company phone number length should be equal to 10 characters",
    },
  },
  email: {
    type: String,
    maxlength: [
      100,
      "Company email length should not be greater than 100 characters",
    ],
  },
  website: {
    type: String,
    maxlength: [
      100,
      "Company website length should not be greater than 100 characters",
    ],
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
});

const UserSchema = new Schema<IUserModel>(
  {
    fname: {
      type: String,
      required: true,
      maxlength: [
        100,
        "First name length should not be greater than 100 characters",
      ],
    },
    lname: {
      type: String,
      required: true,
      maxlength: [
        100,
        "Last name length should not be greater than 100 characters",
      ],
    },
    company: companySchema,
    availabilities: AvailableTimingsSchema,
    isHomeStaff: {
      type: Boolean,
      default: false,
    },
    isAgencyStaff: {
      type: Boolean,
      default: false,
    },
    accountType: {
      type: String,
      enum: [
        "carer",
        "nurse",
        "senior-carer",
        "agency",
        "home",
        "admin",
        "superadmin",
        "user",
        "guest",
        "unknown",
      ],
      default: "user",
    },
    nameChangedAt: { type: Date },
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: [
        100,
        "Email length should not be greater than 100 characters",
      ],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailChangedAt: { type: Date },
    countryCode: {
      type: String,
      maxlength: 20,
    },
    phone: {
      type: String,
      validate: {
        validator: (v: string) => v.length === 10,
        message: "Phone number length should be equal to 10 characters",
      },
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneChangedAt: { type: Date },
    password: {
      type: String,
      maxlength: 1000,
    },
    passwordChangedAt: { type: Date },
    salt: {
      type: String,
      maxlength: 1000,
    },
    avatar: {
      publicId: {
        type: String,
        maxlength: 1000,
      },
      url: {
        type: String,
        maxlength: 500,
      },
    },
    website: {
      type: String,
      maxlength: 100,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: Object.values(EUserStatus),
      default: EUserStatus.active,
    },
    emailVerificationToken: {
      type: String,
      maxlength: 1000,
      required: false,
    },
    verification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      category: {
        type: String,
        maxlength: 100,
      },
      verifiedAt: { type: Date },
      lastRequestedAt: { type: Date },
    },
    fcmTokens: [
      {
        token: {
          type: String,
          required: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          required: false,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
          required: false,
        },
      },
    ],
    stripeCustomerId: {
      type: String,
    },
    activeSubscription: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    stripeSubscriptionId: { type: String },
    paymentHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    annualLeaveConfig: [AnnualLeaveConfigSchema],
    usedLeaveDays: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for full name
UserSchema.virtual("fullName").get(function (this: IUserModel) {
  return `${this.fname} ${this.lname}`;
});

// Indexes
UserSchema.index({ fname: "text", lname: "text", email: "text" });
UserSchema.index({ accountType: 1 });
UserSchema.index({ isHomeStaff: 1, isAgencyStaff: 1 });

// Methods
UserSchema.methods.generateToken = async function (
  this: IUserModel
): Promise<any> {
  const jwtSecret = LocalConfig.getConfig().JWT_SECRET!;
  const jwtExpiresIn = LocalConfig.getConfig().JWT_EXPIRES_IN! || 2592000000;

  if (!jwtSecret) throw new Error(StringValues.JWT_SECRET_NOT_FOUND);

  const token = jwt.sign({ id: this._id }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

  if (!token) {
    Logger.error(`JwtError :: An error occurred while creating JwtToken`);
    throw new Error(StringValues.JWT_TOKEN_CREATE_ERROR);
  }

  const decodedData = jwt.decode(token);

  if (!decodedData || typeof decodedData === "string") {
    Logger.error(`JwtError :: An error occurred while decoding JwtToken`);
    throw new Error(StringValues.JWT_TOKEN_CREATE_ERROR);
  }

  const authToken = await AuthToken.create({
    token: token,
    userId: this._id,
    expiresAt: decodedData.exp!,
  });

  if (!authToken) {
    Logger.error(`AuthToken :: An error occurred while creating AuthToken`);
    throw new Error(StringValues.JWT_TOKEN_CREATE_ERROR);
  }

  Logger.info(`AuthToken :: created`);
  return authToken;
};

UserSchema.methods.getToken = async function (
  this: IUserModel,
  refreshToken = false
): Promise<any> {
  if (refreshToken) {
    await AuthToken.deleteOne({ userId: this._id });
    return this.generateToken();
  }

  const authToken = await AuthToken.findOne({ userId: this._id });

  if (
    !authToken ||
    (await TokenServiceHelper.isTokenExpired(authToken.expiresAt))
  ) {
    await AuthToken.deleteOne({ userId: this._id });
    return this.generateToken();
  }

  return authToken;
};

UserSchema.methods.checkToken = async function (
  this: IUserModel,
  token: string
): Promise<string> {
  const jwtSecret = LocalConfig.getConfig().JWT_SECRET!;

  if (!jwtSecret) throw new Error(StringValues.JWT_SECRET_NOT_FOUND);

  try {
    const decodedData = jwt.verify(token, jwtSecret) as { id: string };

    const authToken = await AuthToken.findOne({
      token: token,
      userId: decodedData.id,
    });

    if (!authToken) {
      Logger.error(`AuthToken :: Token not found`);
      throw new Error(StringValues.JWT_TOKEN_INVALID);
    }

    const user = await User.findById(decodedData.id).lean();

    if (!user) {
      Logger.error(`User :: User not found`);
      throw new Error(StringValues.USER_NOT_FOUND);
    }

    Logger.info(`AuthToken :: Token verified`);
    return user.email;
  } catch (error: any) {
    Logger.error(`JwtError :: An error occurred while verifying JwtToken`);
    throw new Error(StringValues.JWT_TOKEN_INVALID);
  }
};

UserSchema.methods.isProfileComplete = async function (
  this: IUserModel
): Promise<boolean> {
  return !!(this.fullName && this.email);
};

UserSchema.methods.setPassword = async function (
  this: IUserModel,
  password: string
): Promise<void> {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.password = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  this.passwordChangedAt = new Date();
  await this.save();
};

UserSchema.methods.matchPassword = async function (
  this: IUserModel,
  password: string
): Promise<boolean> {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  return this.password === hash;
};

UserSchema.methods.getActiveSubscription = async function (
  this: IUserModel
): Promise<IPayment | null> {
  if (!this.activeSubscription) return null;
  return await Payment.findById(this.activeSubscription);
};

UserSchema.methods.getPaymentHistory = async function (
  this: IUserModel
): Promise<any[]> {
  return await Payment.find({ _id: { $in: this.paymentHistory } }).sort({
    createdAt: -1,
  });
};

UserSchema.methods.updateSubscription = async function (
  this: IUserModel,
  paymentId: any
): Promise<void> {
  this.activeSubscription = paymentId;
  if (!this.paymentHistory.includes(paymentId)) {
    this.paymentHistory.push(paymentId);
  }
  await this.save();
};

// Create the model
const User: Model<IUserModel> =
  mongoose.models.User || model<IUserModel>("User", UserSchema);

export default User;
