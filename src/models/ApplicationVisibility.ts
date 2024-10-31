import mongoose, { Schema, Document } from "mongoose";
import { ICarerApplication } from "./CarerApplication";

export interface IFieldVisibility {
  organizationId: mongoose.Types.ObjectId;
  fields: {
    [K in keyof ICarerApplication]?: boolean | IFieldVisibility["fields"];
  };
}

export interface IFieldVisibilityDocument extends IFieldVisibility, Document {}

const FieldVisibilitySchema = new Schema<IFieldVisibilityDocument>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    unique: true,
  },
  fields: {
    userId: { type: Boolean, default: true },
    personalInfo: {
      title: { type: Boolean, default: true },
      firstName: { type: Boolean, default: true },
      lastName: { type: Boolean, default: true },
      middleName: { type: Boolean, default: true },
      preferredName: { type: Boolean, default: true },
      dateOfBirth: { type: Boolean, default: true },
      gender: { type: Boolean, default: true },
      nationalInsuranceNumber: { type: Boolean, default: true },
      address: {
        street: { type: Boolean, default: true },
        city: { type: Boolean, default: true },
        county: { type: Boolean, default: true },
        country: { type: Boolean, default: true },
        postcode: { type: Boolean, default: true },
      },
      phone: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      emergencyContact: {
        name: { type: Boolean, default: true },
        relationship: { type: Boolean, default: true },
        phone: { type: Boolean, default: true },
      },
    },
    identificationDocuments: {
      passport: {
        number: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      drivingLicense: {
        number: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      biometricResidencePermit: {
        number: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      rightToWorkStatus: { type: Boolean, default: true },
      rightToWorkProofUrl: { type: Boolean, default: true },
    },
    professionalInfo: {
      qualifications: {
        type: { type: Boolean, default: true },
        level: { type: Boolean, default: true },
        institution: { type: Boolean, default: true },
        dateObtained: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      trainings: {
        name: { type: Boolean, default: true },
        provider: { type: Boolean, default: true },
        dateCompleted: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      workExperience: {
        jobTitle: { type: Boolean, default: true },
        employer: { type: Boolean, default: true },
        startDate: { type: Boolean, default: true },
        endDate: { type: Boolean, default: true },
        responsibilities: { type: Boolean, default: true },
        reasonForLeaving: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      references: {
        name: { type: Boolean, default: true },
        position: { type: Boolean, default: true },
        company: { type: Boolean, default: true },
        relationship: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        phone: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      dbsCheck: {
        certificateNumber: { type: Boolean, default: true },
        issueDate: { type: Boolean, default: true },
        status: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
      professionalRegistrations: {
        type: { type: Boolean, default: true },
        registrationNumber: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
        uploadUrl: { type: Boolean, default: true },
      },
    },
    skills: {
      languages: {
        language: { type: Boolean, default: true },
        proficiency: { type: Boolean, default: true },
      },
      careSkills: {
        skill: { type: Boolean, default: true },
        experienceLevel: { type: Boolean, default: true },
      },
      specializations: { type: Boolean, default: true },
    },
    availability: {
      preferredWorkPattern: { type: Boolean, default: true },
      availabilityDetails: {
        monday: {
          available: { type: Boolean, default: true },
          morning: { type: Boolean, default: true },
          afternoon: { type: Boolean, default: true },
          evening: { type: Boolean, default: true },
          night: { type: Boolean, default: true },
        },
        tuesday: {
          available: { type: Boolean, default: true },
          morning: { type: Boolean, default: true },
          afternoon: { type: Boolean, default: true },
          evening: { type: Boolean, default: true },
          night: { type: Boolean, default: true },
        },
        // ... Add remaining days of the week here similar to Monday
      },
      maxHoursPerWeek: { type: Boolean, default: true },
      minHoursPerWeek: { type: Boolean, default: true },
    },
    healthAndSafety: {
      healthDeclaration: {
        hasHealthConditions: { type: Boolean, default: true },
        healthConditionsDetails: { type: Boolean, default: true },
        requiresAdjustments: { type: Boolean, default: true },
        adjustmentsDetails: { type: Boolean, default: true },
        vaccinationStatus: {
          tetanus: { type: Boolean, default: true },
          tetanusDate: { type: Boolean, default: true },
          covid19: { type: Boolean, default: true },
          covid19Date: { type: Boolean, default: true },
          fluShot: { type: Boolean, default: true },
          fluShotDate: { type: Boolean, default: true },
        },
      },
      manualHandlingTraining: {
        completed: { type: Boolean, default: true },
        completionDate: { type: Boolean, default: true },
      },
      foodHygieneCertificate: {
        held: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: true },
      },
    },
    bankDetails: {
      accountHolderName: { type: Boolean, default: true },
      bankName: { type: Boolean, default: true },
      accountNumber: { type: Boolean, default: true },
      sortCode: { type: Boolean, default: true },
    },
    additionalInfo: {
      hasTransport: { type: Boolean, default: true },
      willingToTravel: { type: Boolean, default: true },
      maxTravelDistance: { type: Boolean, default: true },
      additionalNotes: { type: Boolean, default: true },
    },
    applicationStatus: {
      status: { type: Boolean, default: true },
      submissionDate: { type: Boolean, default: true },
      reviewDate: { type: Boolean, default: true },
      reviewedBy: { type: Boolean, default: true },
      statusChangeLog: {
        status: { type: Boolean, default: true },
        changedAt: { type: Boolean, default: true },
        changedBy: { type: Boolean, default: true },
        reason: { type: Boolean, default: true },
      },
    },
    consents: {
      dataProcessing: { type: Boolean, default: true },
      backgroundCheck: { type: Boolean, default: true },
      termsAndConditions: { type: Boolean, default: true },
    },
  },
});

const FieldVisibility = mongoose.model<IFieldVisibilityDocument>(
  "FieldVisibility",
  FieldVisibilitySchema
);

export default FieldVisibility;
