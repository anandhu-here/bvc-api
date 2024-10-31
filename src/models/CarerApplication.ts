import mongoose, { Schema, Document, Model } from "mongoose";

// Subdocument Interfaces
interface IAddress {
  street: string;
  city: string;
  county: string;
  country: string;
  postcode?: string;
}

interface IAvailability {
  monday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  tuesday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  wednesday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  thursday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  friday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  saturday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
  sunday?: {
    available: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
}

interface IQualification {
  name: string;
  level: string;
  institution: string;
  dateObtained: Date;
  expiryDate?: Date;
  uploadUrl?: string;
}

interface ITraining {
  name: string;
  provider: string;
  dateCompleted?: Date;
  expiryDate?: Date;
  uploadUrl?: string;
}

interface IWorkExperience {
  jobTitle: string;
  employer: string;
  startDate: Date;
  endDate?: Date;
  responsibilities?: string;
  reasonForLeaving?: string;
  uploadUrl?: string;
}

interface IReference {
  name: string;
  position: string;
  company: string;
  relationship: string;
  email: string;
  phone: string;
  uploadUrl?: string;
}

interface IHealthDeclaration {
  hasHealthConditions: boolean;
  healthConditionsDetails?: string;
  requiresAdjustments: boolean;
  adjustmentsDetails?: string;
  vaccinationStatus?: {
    tetanus?: boolean;
    tetanusDate?: Date;
    covid19?: boolean;
    covid19Date?: Date;
    fluShot?: boolean;
    fluShotDate?: Date;
  };
}

// Main CarerApplication Interface
export interface ICarerApplication {
  userId: mongoose.Types.ObjectId;
  personalInfo: {
    title?: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    dateOfBirth: Date;
    gender?: string;
    nationalInsuranceNumber: string;
    address: IAddress;
    phone: string;
    email: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
    jobTitle?: string;
  };
  identificationDocuments: {
    passport?: {
      number?: string;
      expiryDate?: Date;
      uploadUrl?: string;
    };
    drivingLicense?: {
      number?: string;
      expiryDate?: Date;
      uploadUrl?: string;
    };
    biometricResidencePermit?: {
      number?: string;
      expiryDate?: Date;
      uploadUrl?: string;
    };
    rightToWorkStatus: string;
    rightToWorkProofUrl?: string;
  };
  professionalInfo?: {
    qualifications?: IQualification[];
    trainings?: ITraining[];
    workExperience?: IWorkExperience[];
    references?: IReference[];
    dbsCheck?: {
      certificateNumber?: string;
      issueDate?: Date;
      status?: string;
      uploadUrl?: string;
    };
    professionalRegistrations?: Array<{
      type?: string;
      registrationNumber?: string;
      expiryDate?: Date;
      uploadUrl?: string;
    }>;
  };
  skills?: {
    languages?: Array<{
      language: string;
      proficiency: string;
    }>;
    careSkills?: Array<{
      skill: string;
      experienceLevel: string;
    }>;
    specializations?: string[];
  };
  availability?: {
    preferredWorkPattern?: string;
    availabilityDetails?: IAvailability;
    maxHoursPerWeek?: number;
    minHoursPerWeek?: number;
  };
  healthAndSafety?: {
    healthDeclaration: IHealthDeclaration;
    manualHandlingTraining?: {
      completed: boolean;
      completionDate?: Date;
    };
    foodHygieneCertificate?: {
      held: boolean;
      expiryDate?: Date;
    };
  };
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    sortCode: string;
  };
  additionalInfo?: {
    hasTransport?: boolean;
    willingToTravel?: boolean;
    maxTravelDistance?: number;
    additionalNotes?: string;
  };
  applicationStatus?: {
    status: string;
    submissionDate?: Date;
    reviewDate?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    statusChangeLog?: Array<{
      status: string;
      changedAt: Date;
      changedBy?: mongoose.Types.ObjectId;
      reason?: string;
    }>;
  };
  consents: {
    dataProcessing: boolean;
    backgroundCheck: boolean;
    termsAndConditions: boolean;
  };
}

// Interface for the document
export interface ICarerApplicationDocument extends ICarerApplication, Document {
  fullName: string; // Virtual
  isApplicationComplete(): boolean;
}

// Interface for the model
export interface ICarerApplicationModel
  extends Model<ICarerApplicationDocument> {
  findByUserId(userId: string): Promise<ICarerApplicationDocument | null>;
}

// Subdocument Schemas
const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: false },
    city: { type: String, required: false },
    county: { type: String, required: false },
    country: { type: String, required: false },
    postcode: { type: String, required: false, uppercase: true },
  },
  { _id: false }
);

const AvailabilitySchema = new Schema<IAvailability>(
  {
    monday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    tuesday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    wednesday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    thursday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    friday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    saturday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
    sunday: {
      available: Boolean,
      morning: Boolean,
      afternoon: Boolean,
      evening: Boolean,
      night: Boolean,
    },
  },
  { _id: false }
);

const QualificationSchema = new Schema<IQualification>(
  {
    name: { type: String, required: false },
    level: { type: String, required: false },
    institution: { type: String, required: false },
    dateObtained: { type: Date, required: false },
    expiryDate: { type: Date },
    uploadUrl: { type: String },
  },
  { timestamps: true }
);

const TrainingSchema = new Schema<ITraining>(
  {
    name: { type: String, required: false },
    provider: { type: String, required: false },
    dateCompleted: { type: Date, required: false },
    expiryDate: { type: Date, required: false },
    uploadUrl: { type: String, required: false },
  },
  { timestamps: true }
);

const WorkExperienceSchema = new Schema<IWorkExperience>(
  {
    jobTitle: { type: String, required: false },
    employer: { type: String, required: false },
    startDate: { type: Date, required: false },
    endDate: { type: Date },
    responsibilities: { type: String },
    reasonForLeaving: { type: String },
    uploadUrl: { type: String },
  },
  { timestamps: true }
);

const ReferenceSchema = new Schema<IReference>(
  {
    name: { type: String, required: false },
    position: { type: String, required: false },
    company: { type: String, required: false },
    relationship: { type: String, required: false },
    email: { type: String, required: false },
    phone: { type: String, required: false },
    uploadUrl: { type: String },
  },
  { timestamps: true }
);

const HealthDeclarationSchema = new Schema<IHealthDeclaration>(
  {
    hasHealthConditions: { type: Boolean, required: false },
    healthConditionsDetails: { type: String },
    requiresAdjustments: { type: Boolean, required: false },
    adjustmentsDetails: { type: String },
    vaccinationStatus: {
      tetanus: { type: Boolean },
      tetanusDate: { type: Date },
      covid19: { type: Boolean },
      covid19Date: { type: Date },
      fluShot: { type: Boolean },
      fluShotDate: { type: Date },
    },
  },
  { _id: false }
);

// Main Carer Application Schema
const CarerApplicationSchema = new Schema<ICarerApplicationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      unique: true,
    },
    personalInfo: {
      title: { type: String, enum: ["Mr", "Mrs", "Miss", "Ms", "Dr", "Other"] },
      jobTitle: { type: String, required: false },
      firstName: { type: String, required: false, trim: true },
      lastName: { type: String, required: false, trim: true },
      middleName: { type: String, trim: true },
      preferredName: { type: String, trim: true },
      dateOfBirth: { type: Date, required: false },
      gender: {
        type: String,
        enum: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"],
      },
      nationalInsuranceNumber: {
        type: String,
        required: false,
        sparse: true,
        uppercase: true,
        validate: {
          validator: function (v: string) {
            return (
              v === null ||
              /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D\s]$/.test(
                v
              )
            );
          },
          message: (props) =>
            `${props.value} is not a valid National Insurance number!`,
        },
      },
      address: { type: AddressSchema, required: false },
      phone: {
        type: String,
        required: false,
        validate: {
          validator: function (v: string) {
            return (
              v === null ||
              /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/.test(v)
            );
          },
          message: (props) => `${props.value} is not a valid UK phone number!`,
        },
      },
      email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        lowercase: true,
        validate: {
          validator: function (v: string) {
            return v === null || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
          },
          message: (props) => `${props.value} is not a valid email address!`,
        },
      },
      emergencyContact: {
        name: { type: String, required: false },
        relationship: { type: String, required: false },
        phone: { type: String, required: false },
      },
    },
    identificationDocuments: {
      passport: {
        number: { type: String },
        expiryDate: { type: Date },
        uploadUrl: { type: String },
      },
      drivingLicense: {
        number: { type: String },
        expiryDate: { type: Date },
        uploadUrl: { type: String },
      },
      biometricResidencePermit: {
        number: { type: String },
        expiryDate: { type: Date },
        uploadUrl: { type: String },
      },
      rightToWorkStatus: {
        type: String,
        enum: ["UK Citizen", "EU Settled Status", "Visa Required"],
        required: false,
      },
      rightToWorkProofUrl: { type: String },
    },
    professionalInfo: {
      qualifications: [QualificationSchema],
      trainings: [TrainingSchema],
      workExperience: [WorkExperienceSchema],
      references: [ReferenceSchema],
      dbsCheck: {
        certificateNumber: { type: String },
        issueDate: { type: Date },
        status: {
          type: String,
          enum: ["Clear", "Not Clear", "Pending", "Not Applicable"],
        },
        uploadUrl: { type: String },
      },
      professionalRegistrations: [
        {
          type: { type: String, enum: ["NMC", "HCPC", "Other"] },
          registrationNumber: { type: String },
          expiryDate: { type: Date },
          uploadUrl: { type: String },
        },
      ],
    },
    skills: {
      languages: [
        {
          language: String,
          proficiency: {
            type: String,
            enum: ["Basic", "Conversational", "Fluent", "Native"],
          },
        },
      ],
      careSkills: [
        {
          skill: String,
          experienceLevel: {
            type: String,
            enum: ["Novice", "Intermediate", "Expert"],
          },
        },
      ],
      specializations: [String],
    },
    availability: {
      preferredWorkPattern: {
        type: String,
        enum: ["Full-time", "Part-time", "Flexible"],
      },
      availabilityDetails: AvailabilitySchema,
      maxHoursPerWeek: { type: Number, min: 0, max: 168 },
      minHoursPerWeek: { type: Number, min: 0, max: 168 },
    },
    healthAndSafety: {
      healthDeclaration: HealthDeclarationSchema,
      manualHandlingTraining: {
        completed: { type: Boolean },
        completionDate: { type: Date },
      },
      foodHygieneCertificate: {
        held: { type: Boolean },
        expiryDate: { type: Date },
      },
    },
    bankDetails: {
      accountHolderName: { type: String, required: false },
      bankName: { type: String, required: false },
      accountNumber: {
        type: String,
        required: false,
        validate: {
          validator: function (v: string) {
            return /^\d{8}$/.test(v);
          },
          message: (props) =>
            `${props.value} is not a valid UK bank account number!`,
        },
      },
      sortCode: {
        type: String,
        required: false,
        validate: {
          validator: function (v: string) {
            return /^\d{2}-?\d{2}-?\d{2}$/.test(v);
          },
          message: (props) => `${props.value} is not a valid UK sort code!`,
        },
      },
    },
    additionalInfo: {
      hasTransport: { type: Boolean },
      willingToTravel: { type: Boolean },
      maxTravelDistance: { type: Number }, // in miles
      additionalNotes: { type: String },
    },
    applicationStatus: {
      status: {
        type: String,
        enum: ["Draft", "Submitted", "Under Review", "Approved", "Rejected"],
        default: "Draft",
      },
      submissionDate: { type: Date },
      reviewDate: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      statusChangeLog: [
        {
          status: { type: String },
          changedAt: { type: Date },
          changedBy: { type: Schema.Types.ObjectId, ref: "User" },
          reason: { type: String },
        },
      ],
    },
    consents: {
      dataProcessing: { type: Boolean, required: false },
      backgroundCheck: { type: Boolean, required: false },
      termsAndConditions: { type: Boolean, required: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
CarerApplicationSchema.index({
  "personalInfo.firstName": 1,
  "personalInfo.lastName": 1,
});
CarerApplicationSchema.index({ "personalInfo.email": 1 }, { sparse: true });
CarerApplicationSchema.index(
  { "personalInfo.nationalInsuranceNumber": 1 },
  { sparse: true, unique: true }
);
CarerApplicationSchema.index({ "applicationStatus.status": 1 });
CarerApplicationSchema.index({ "skills.careSkills.skill": 1 });
CarerApplicationSchema.index({ "availability.preferredWorkPattern": 1 });

// Virtual for full name
CarerApplicationSchema.virtual("fullName").get(function (
  this: ICarerApplicationDocument
) {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Pre-save middleware to set submission date
CarerApplicationSchema.pre(
  "save",
  function (this: ICarerApplicationDocument, next) {
    if (
      this.isModified("applicationStatus.status") &&
      this.applicationStatus?.status === "Submitted"
    ) {
      this.applicationStatus.submissionDate = new Date();
    }
    next();
  }
);

// Static methods
CarerApplicationSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId });
};

// Instance methods
CarerApplicationSchema.methods.isApplicationComplete = function (
  this: ICarerApplicationDocument
): boolean {
  return !!(
    this.personalInfo.firstName &&
    this.personalInfo.lastName &&
    this.personalInfo.dateOfBirth &&
    this.personalInfo.nationalInsuranceNumber &&
    this.personalInfo.address &&
    this.personalInfo.phone &&
    this.personalInfo.email &&
    this.identificationDocuments.rightToWorkStatus &&
    this.bankDetails.accountHolderName &&
    this.bankDetails.bankName &&
    this.bankDetails.accountNumber &&
    this.bankDetails.sortCode &&
    this.consents.dataProcessing &&
    this.consents.backgroundCheck &&
    this.consents.termsAndConditions
  );
};

CarerApplicationSchema.index({ userId: 1, "applicationStatus.status": 1 });

// Create and export the model
const CarerApplication = mongoose.model<
  ICarerApplicationDocument,
  ICarerApplicationModel
>("CarerApplication", CarerApplicationSchema);

export default CarerApplication;
