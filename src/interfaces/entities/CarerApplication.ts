import { Document, Types } from "mongoose";

export interface INextOfKin {
  name: string;
  relationship: string;
  phoneNumber: string;
  mobileNumber?: string;
  email: string;
  address: string;
}
export interface IIdentificationInfo {
  identificationType:
    | "passport"
    | "drivingLicense"
    | "birthCertificate"
    | "biometricResidencePermit";
  documentUrl: string;
  documentType?: string;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
}

export interface IQualification {
  name: string;
  institution: string;
  year: string;
}

export interface ITraining {
  name: string;
  provider: string;
  completionDate: Date;
}

export interface IDayAvailability {
  available: boolean;
  day: boolean;
  night: boolean;
}
export interface IAvailabilitySchedule {
  monday: IDayAvailability;
  tuesday: IDayAvailability;
  wednesday: IDayAvailability;
  thursday: IDayAvailability;
  friday: IDayAvailability;
  saturday: IDayAvailability;
  sunday: IDayAvailability;
  preferredShiftLength: string;
  maxHoursPerWeek: number;
  additionalNotes: string;
}

export interface ICarerApplicationModel extends Document {
  userId: Types.ObjectId;
  personalInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other" | "prefer-not-to-say";
    avatarUrl?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  identificationInfo?: IIdentificationInfo;
  rightToWork?: {
    rightToWorkType?: "passport" | "brp" | "visa";
    documentUrl?: string;
    fileName?: string;
    uploadDate?: string;
    expiryDate?: string;
    shareCode?: string;
  };
  backgroundCheck?: {
    backgroundCheckType?: "basic" | "standard" | "enhanced";
    documentUrl?: string;
    fileName?: string;
    uploadDate?: string;
    expiryDate?: string;
    dbsNumber?: string;
    documentType?: string;
  };
  taxInfo?: {
    niNumber?: string;
    taxCode?: string;
    hasP45?: boolean;
    hasStudentLoan?: boolean;
  };
  dbsCheck?: {
    certificateNumber?: string;
    issueDate?: Date;
    status?: "clear" | "notClear" | "pending" | "notApplicable";
  };
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
    iban?: string;
    concentToDirectDeposit?: boolean;
  };
  qualificationsAndTraining?: {
    qualifications?: IQualification[];
    trainings?: ITraining[];
    skills?: string[];
  };
  workExperience?: Array<{
    jobTitle?: string;
    employer?: string;
    startDate?: Date;
    endDate?: Date;
    responsibilities?: string;
    currentlyWorking?: boolean;
  }>;

  diversityInfo?: any;

  nextOfKin: INextOfKin;
  availability: IAvailabilitySchedule;
  preferredShiftLength?: number;
  maxHoursPerWeek?: number;
  specializations?: string[];
  languages?: string[];
  skillsAssessment?: {
    personalCare?: number;
    mobility?: number;
    medication?: number;
    mealPreparation?: number;
    housekeeping?: number;
    communication?: number;
    timeManagement?: number;
    problemSolving?: number;
  };
  healthInfo?: any;
  references?: Array<{
    name?: string;
    relationship?: string;
    company?: string;
    email?: string;
    phone?: string;
  }>;
  documents?: Array<{
    name?: string;
    type?: string;
    url?: string;
    uploadDate?: Date;
  }>;
  drivingLicense?: {
    status?: boolean;
    number?: string;
    expiryDate?: Date;
  };

  ownVehicle?: boolean;
  willingToTravel?: boolean;
  professionalMemberships?: Array<{
    organization?: string;
    membershipNumber?: string;
    expiryDate?: Date;
  }>;
  additionalInfo?: string;
  applicationStatus:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";
  consentToDataProcessing: boolean;
  verificationStatus: {
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
  };

  createdAt: Date;
  updatedAt: Date;
}
