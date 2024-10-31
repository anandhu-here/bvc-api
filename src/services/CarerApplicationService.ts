import { Document, Types } from "mongoose";
import CarerApplication, {
  ICarerApplication,
  ICarerApplicationDocument,
} from "../models/CarerApplication";
import Logger from "../logger";
import { UploadedFile } from "express-fileupload";
import User from "../models/User";
import {
  isArray,
  merge,
  set,
  get,
  isPlainObject,
  omitBy,
  update,
} from "lodash";

import CarerDocumentService from "./CarerService";
import FieldVisibilityService from "./ApplicationVisibility";

interface PendingField {
  section: string;
  field: string;
}

interface ApplicationStatus {
  status: string;
  completionPercentage: number;
  pendingFields: PendingField[];
}

type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends object ? NestedPartial<T[K]> : T[K];
};

interface FieldStatus {
  completed: boolean;
  value: any;
}

interface SectionStatus {
  name: string;
  completed: boolean;
  fields: { [key: string]: FieldStatus };
}

interface CompletionStatus {
  percentageComplete: number;
  sectionsStatus: SectionStatus[];
}

class CarerApplicationService {
  private readonly _carerDocumentSvc: CarerDocumentService;
  private readonly _fieldVisibilitySvc: FieldVisibilityService;

  constructor() {
    this._carerDocumentSvc = new CarerDocumentService();
    this._fieldVisibilitySvc = new FieldVisibilityService();
  }

  private constructUpdateQuery(path: string, data: any): any {
    const updateQuery: any = {};
    set(updateQuery, path, data);
    return updateQuery;
  }

  public async getOrCreateApplication(
    userId: string
  ): Promise<ICarerApplicationDocument> {
    try {
      let application = await CarerApplication.findOne({ userId });
      if (!application) {
        application = new CarerApplication({ userId });
        await application.save();
      }
      return application;
    } catch (error: any) {
      Logger.error("CarerApplicationService: getOrCreateApplication", error);
      throw error;
    }
  }

  async getApplicationFull(userId: string) {
    try {
      let application = await CarerApplication.findOne({ userId }).lean();

      if (!application) {
        application = new CarerApplication({ userId });
        await application.save();
      }
      return application;
    } catch (error: any) {
      Logger.error("CarerApplicationService: getOrCreateApplication", error);
      throw error;
    }
  }

  async getApplication(userId: string, organizationId: string) {
    const fieldVisibility = await this._fieldVisibilitySvc.getFieldVisibility(
      organizationId
    );

    if (!fieldVisibility) {
      return CarerApplication.findOne({ userId: new Types.ObjectId(userId) });
    }

    const projectionStage =
      await this._fieldVisibilitySvc.generateProjectionStage(
        fieldVisibility.fields
      );

    const pipeline = [
      { $match: { userId: new Types.ObjectId(userId) } },
      { $project: projectionStage },
    ];

    const result = await CarerApplication.aggregate(pipeline);
    return result[0]; // Return the first (and should be only) result
  }

  public async createOrUpdateApplication(
    userId: string,
    data: Partial<ICarerApplication>
  ): Promise<ICarerApplicationDocument> {
    try {
      const application = await this.getOrCreateApplication(userId);

      if (application.userId.toString() !== userId) {
        throw new Error("Unauthorized");
      }

      merge(application, data);
      await application.save();
      return application;
    } catch (error: any) {
      Logger.error("CarerApplicationService: createOrUpdateApplication", error);
      throw error;
    }
  }

  public async updateSection(
    userId: string,
    path: string,
    data: any,
    index?: number
  ): Promise<ICarerApplication> {
    try {
      const application = await this.getOrCreateApplication(userId);
      let updateQuery: any = { $set: {}, $unset: {} };

      // Get the current array for the given path
      const currentArray = get(application, path, []);

      if (typeof index === "number") {
        // Array update
        if (index >= currentArray.length) {
          // If index is out of bounds, push to the array
          updateQuery.$push = { [path]: data };
        } else {
          // Otherwise, set the specific index
          updateQuery.$set[`${path}.${index}`] = data;
        }
      } else if (Array.isArray(currentArray)) {
        // If it's an array field but no index provided, append to the array
        updateQuery.$push = { [path]: data };
      } else if (isPlainObject(data)) {
        // Object update
        updateQuery.$set[path] = data;
      } else {
        // Simple field update
        updateQuery.$set[path] = data;
      }

      // Remove empty operators
      updateQuery = omitBy(updateQuery, (obj) => Object.keys(obj).length === 0);

      await CarerApplication.updateOne({ userId }, updateQuery, {
        runValidators: true,
      });
      return (await CarerApplication.findOne({ userId })) as ICarerApplication;
    } catch (error: any) {
      Logger.error("CarerApplicationService: updateSection", error);
      throw error;
    }
  }

  public async addToArray(
    userId: string,
    arrayPath: string,
    item: any
  ): Promise<ICarerApplicationDocument> {
    try {
      const updateQuery = { $push: { [arrayPath]: item } };
      await CarerApplication.updateOne({ userId }, updateQuery, {
        runValidators: true,
      });
      return (await CarerApplication.findOne({
        userId,
      })) as ICarerApplicationDocument;
    } catch (error: any) {
      Logger.error("CarerApplicationService: addToArray", error);
      throw error;
    }
  }

  public async removeFromArray(
    userId: string,
    arrayPath: string,
    index: number
  ): Promise<ICarerApplicationDocument> {
    try {
      const updateQuery = { $unset: { [`${arrayPath}.${index}`]: 1 } };
      await CarerApplication.updateOne({ userId }, updateQuery);
      await CarerApplication.updateOne(
        { userId },
        { $pull: { [arrayPath]: null } }
      );
      return (await CarerApplication.findOne({
        userId,
      })) as ICarerApplicationDocument;
    } catch (error: any) {
      Logger.error("CarerApplicationService: removeFromArray", error);
      throw error;
    }
  }

  public async uploadDocument(
    userId: string,
    file: UploadedFile,
    path: string,
    documentType: string,
    index?: number
  ): Promise<ICarerApplication> {
    try {
      const application = await this.getOrCreateApplication(userId);
      const uploadedDocument = await this._carerDocumentSvc.addDocument(
        userId,
        file,
        path
      );

      const documentData = {
        uploadUrl: uploadedDocument.url,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        documentType: documentType,
      };

      let updateQuery: any = { $set: {} };

      if (typeof index === "number") {
        updateQuery.$set[`${path}.${index}.uploadUrl`] = documentData.uploadUrl;
        updateQuery.$set[`${path}.${index}.fileName`] = documentData.fileName;
        updateQuery.$set[`${path}.${index}.uploadDate`] =
          documentData.uploadDate;
      } else {
        updateQuery.$set[`${path}.uploadUrl`] = documentData.uploadUrl;
        updateQuery.$set[`${path}.fileName`] = documentData.fileName;
        updateQuery.$set[`${path}.uploadDate`] = documentData.uploadDate;
      }

      await CarerApplication.updateOne({ userId }, updateQuery, {
        runValidators: true,
      });
      return (await CarerApplication.findOne({ userId })) as ICarerApplication;
    } catch (error: any) {
      Logger.error("CarerApplicationService: uploadDocument", error);
      throw error;
    }
  }

  public async deleteDocument(
    userId: string,
    section: string,
    index?: number
  ): Promise<any> {
    try {
      const application = await this.getOrCreateApplication(userId);
      console.log(section, "ccsdcdccdcds");
      let path = `${section}`;

      console.log(index, "index");
      console.log(index === undefined);
      if (index !== undefined) {
        path += `.${index}`;
      }

      const documentUrl = get(application, `${path}.uploadUrl`);

      if (documentUrl) {
        await this._carerDocumentSvc.deleteFile(documentUrl);
      }

      let updateQuery: any = {};
      if (index !== undefined) {
        // For array fields
        updateQuery = {
          $unset: {
            [`${path}.uploadUrl`]: "",
          },
        };
      } else {
        // For non-array fields
        updateQuery = {
          $set: {
            [`${path}.uploadUrl`]: null,
          },
        };
      }

      const updatedApplication = await CarerApplication.findOneAndUpdate(
        { userId },
        updateQuery,
        { new: true, runValidators: true }
      );

      if (!updatedApplication) {
        throw new Error("Application not found");
      }

      return updatedApplication;
    } catch (error: any) {
      Logger.error("CarerApplicationService: deleteDocument", error);
      throw error;
    }
  }

  public async submitApplication(
    userId: string
  ): Promise<ICarerApplicationDocument> {
    try {
      const application = await this.getOrCreateApplication(userId);
      application.set("applicationStatus.status", "Submitted");
      application.set("applicationStatus.submissionDate", new Date());
      await application.save();
      return application;
    } catch (error: any) {
      Logger.error("CarerApplicationService: submitApplication", error);
      throw error;
    }
  }

  public async uploadDocuments(
    userId: string,
    files: { [fieldname: string]: UploadedFile },
    formData: any
  ): Promise<ICarerApplicationDocument> {
    try {
      const application = await this.getOrCreateApplication(userId);

      for (const [fieldName, file] of Object.entries(files)) {
        const uploadedDocument = await this._carerDocumentSvc.addDocument(
          userId,
          file as UploadedFile,
          fieldName
        );

        const path = this.getPathFromFieldName(fieldName);
        if (path) {
          const documentData = {
            uploadUrl: uploadedDocument.url,
            fileName: uploadedDocument.name,
            uploadDate: new Date(),
          };
          const updateQuery = this.constructUpdateQuery(path, documentData);
          await CarerApplication.updateOne(
            { userId },
            { $set: updateQuery },
            { runValidators: true }
          );
        } else {
          await this.addToArray(userId, "documents", {
            name: uploadedDocument.name,
            type: formData[`${fieldName}Type`] || "default",
            url: uploadedDocument.url,
            uploadDate: new Date(),
          });
        }
      }

      for (const [key, value] of Object.entries(formData)) {
        if (!key.endsWith("Type")) {
          const path = this.getPathFromFieldName(key);
          if (path) {
            const updateQuery = this.constructUpdateQuery(path, value);
            await CarerApplication.updateOne(
              { userId },
              { $set: updateQuery },
              { runValidators: true }
            );
          }
        }
      }

      return (await CarerApplication.findOne({
        userId,
      })) as ICarerApplicationDocument;
    } catch (error: any) {
      Logger.error("CarerApplicationService: uploadDocuments", error);
      throw error;
    }
  }

  private extractFilePathFromUrl(url: string): string | null {
    try {
      const pathParts = url.split("/uploads/");
      return pathParts.length === 2 ? pathParts[1] : null;
    } catch (error: any) {
      Logger.error("CarerApplicationService: extractFilePathFromUrl", error);
      return null;
    }
  }

  private getPathFromFieldName(fieldName: string): string | undefined {
    const paths: { [key: string]: string } = {
      identityDocument: "identificationDocuments.passport",
      drivingLicense: "identificationDocuments.drivingLicense",
      biometricResidencePermit:
        "identificationDocuments.biometricResidencePermit",
      rightToWorkProof: "identificationDocuments.rightToWorkProofUrl",
      // Add more mappings as needed
    };
    return paths[fieldName];
  }

  // status

  public async getApplicationStatus(
    userId: string
  ): Promise<ApplicationStatus> {
    try {
      const application = await CarerApplication.findOne({ userId }).lean();

      if (!application) {
        throw new Error("Application not found");
      }

      const status = application.applicationStatus?.status || "Draft";
      const { completionPercentage, pendingFields } =
        this.calculateApplicationCompletion(application);

      return { status, completionPercentage, pendingFields };
    } catch (error: any) {
      Logger.error("CarerApplicationService: getApplicationStatus", error);
      if (error.message === "Application not found") {
        throw new Error("Application not found for the given user ID");
      }
      throw new Error(
        "An error occurred while fetching the application status"
      );
    }
  }

  private calculateApplicationCompletion(application: any): {
    completionPercentage: number;
    pendingFields: PendingField[];
  } {
    const sections = [
      "personalInfo",
      "identificationDocuments",
      "professionalInfo",
      "skills",
      "availability",
      "healthAndSafety",
      "bankDetails",
      "additionalInfo",
      "consents",
    ];

    const sectionWeights: { [key: string]: number } = {
      personalInfo: 20,
      identificationDocuments: 20,
      professionalInfo: 15,
      skills: 10,
      availability: 10,
      healthAndSafety: 10,
      bankDetails: 5,
      additionalInfo: 5,
      consents: 5,
    };

    let totalWeight = 0;
    let completedWeight = 0;
    const pendingFields: PendingField[] = [];

    for (const section of sections) {
      const weight = sectionWeights[section];
      totalWeight += weight;

      const { isComplete, incompleteFields } = this.checkSectionCompletion(
        application,
        section
      );

      if (isComplete) {
        completedWeight += weight;
      } else {
        pendingFields.push(
          ...incompleteFields.map((field) => ({ section, field }))
        );
      }
    }

    const completionPercentage = Math.round(
      (completedWeight / totalWeight) * 100
    );

    return { completionPercentage, pendingFields };
  }

  private checkSectionCompletion(
    application: any,
    section: string
  ): { isComplete: boolean; incompleteFields: string[] } {
    const sectionData = application[section];
    const incompleteFields: string[] = [];

    if (!sectionData) return { isComplete: false, incompleteFields: [section] };

    switch (section) {
      case "personalInfo":
        [
          "firstName",
          "lastName",
          "dateOfBirth",
          "nationalInsuranceNumber",
          "address",
          "phone",
          "email",
        ].forEach((field) => {
          if (!sectionData[field]) incompleteFields.push(field);
        });
        break;
      case "identificationDocuments":
        if (!sectionData.rightToWorkStatus)
          incompleteFields.push("rightToWorkStatus");
        break;
      case "professionalInfo":
        if (
          !(
            sectionData.qualifications?.length ||
            sectionData.trainings?.length ||
            sectionData.workExperience?.length ||
            sectionData.references?.length
          )
        ) {
          incompleteFields.push("professionalInfo");
        }
        break;
      case "skills":
        if (
          !(sectionData.languages?.length || sectionData.careSkills?.length)
        ) {
          incompleteFields.push("skills");
        }
        break;
      case "availability":
        if (!sectionData.preferredWorkPattern)
          incompleteFields.push("preferredWorkPattern");
        break;
      case "healthAndSafety":
        if (!sectionData.healthDeclaration)
          incompleteFields.push("healthDeclaration");
        break;
      case "bankDetails":
        ["accountHolderName", "bankName", "accountNumber", "sortCode"].forEach(
          (field) => {
            if (!sectionData[field]) incompleteFields.push(field);
          }
        );
        break;
      case "additionalInfo":
        // This section is optional, so we consider it complete
        break;
      case "consents":
        ["dataProcessing", "backgroundCheck", "termsAndConditions"].forEach(
          (field) => {
            if (!sectionData[field]) incompleteFields.push(field);
          }
        );
        break;
    }

    return { isComplete: incompleteFields.length === 0, incompleteFields };
  }
}

export default CarerApplicationService;
