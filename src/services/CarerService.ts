import admin from "firebase-admin";
import { UploadedFile } from "express-fileupload";
import CarerApplication from "../models/CarerApplication";
import { ICarerApplicationModel } from "../interfaces/entities/CarerApplication";
import Logger from "../logger";

class CarerDocumentService {
  private bucket: string;

  constructor() {
    this.bucket = process.env.BUCKET;
    if (!this.bucket) {
      throw new Error("Firebase storage bucket is not defined");
    }
  }

  private async initializeFirebase() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: this.bucket,
      });
    }
  }

  public uploadManualTimesheet = async (
    file: UploadedFile,
    fileName: string
  ): Promise<string> => {
    try {
      return await this.uploadFile(file, fileName);
    } catch (error: any) {
      Logger.error("CarerDocumentService: uploadManualTimesheet", error);
      throw new Error(`Failed to upload manual timesheet: ${error.message}`);
    }
  };

  public async uploadFile(
    file: UploadedFile,
    fileName: string
  ): Promise<string> {
    try {
      await this.initializeFirebase();
      const bucket = admin.storage().bucket(this.bucket);
      const fileBuffer = Buffer.from(file.data);

      const fileUpload = bucket.file(fileName);
      await fileUpload.save(fileBuffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      await fileUpload.makePublic();

      return `https://firebasestorage.googleapis.com/v0/b/${
        this.bucket
      }/o/${encodeURIComponent(fileName)}?alt=media`;
    } catch (error: any) {
      Logger.error("CarerDocumentService: uploadFile", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  public async deleteFile(fileUrl: string): Promise<void> {
    try {
      const decodeUrl = decodeURIComponent(fileUrl);

      // Extract the file path from the URL
      const urlParts = new URL(decodeUrl);
      const pathName = urlParts.pathname;
      let filePath = pathName.split("/o/")[1];

      // Remove query parameters if present
      filePath = filePath.split("?")[0];

      if (!filePath) {
        throw new Error("Invalid file URL");
      }

      console.log("Attempting to delete file:", filePath);

      await this.initializeFirebase();
      const bucket = admin.storage().bucket(this.bucket);
      const file = bucket.file(filePath);

      await file.delete();
      console.log("File deleted successfully:", filePath);
    } catch (error: any) {
      Logger.error(
        "CarerDocumentService: deleteFile",
        `Error deleting file ${fileUrl}: ${error.message}`
      );
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  public async addDocument(
    userId: string,
    file: UploadedFile,
    section: string
  ): Promise<{ name: string; url: string; uploadDate: Date }> {
    try {
      const fileName = `${userId}/${section}/${file.name}`;

      console.log(fileName, "filenaenaewdfmewdane");
      const url = await this.uploadFile(file, fileName);

      const document = {
        name: file.name,
        url,
        uploadDate: new Date(),
      };

      await CarerApplication.findOneAndUpdate(
        { userId },
        {
          $set: {
            [`${section}.documentUrl`]: url,
            [`${section}.fileName`]: file.name,
            [`${section}.uploadDate`]: document.uploadDate,
          },
        },
        { upsert: true, new: true }
      );

      return document;
    } catch (error: any) {
      Logger.error("CarerDocumentService: addDocument", error);
      throw new Error(`Failed to add document: ${error.message}`);
    }
  }

  public async deleteDocument(userId: string, section: string): Promise<void> {
    try {
      const application = await CarerApplication.findOne({ userId });
      if (!application) {
        throw new Error("Carer application not found");
      }

      const fileName = application.get(`${section}.fileName`);
      if (!fileName) {
        throw new Error("Document not found");
      }

      await this.deleteFile(`${userId}/${section}/${fileName}`);

      await CarerApplication.findOneAndUpdate(
        { userId },
        {
          $unset: {
            [`${section}.documentUrl`]: "",
            [`${section}.fileName`]: "",
            [`${section}.uploadDate`]: "",
          },
        }
      );
    } catch (error: any) {
      Logger.error("CarerDocumentService: deleteDocument", error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  public async getCarerDocuments(userId: string): Promise<any> {
    try {
      return await CarerApplication.findOne({ userId }).lean();
    } catch (error: any) {
      Logger.error("CarerDocumentService: getCarerDocuments", error);
      throw new Error(`Failed to get carer documents: ${error.message}`);
    }
  }

  public async updateShareCode(
    userId: string,
    shareCode: string
  ): Promise<void> {
    try {
      const result = await CarerApplication.findOneAndUpdate(
        { userId },
        { $set: { "identificationDocuments.rightToWorkStatus": shareCode } },
        { new: true }
      );
      if (!result) {
        throw new Error("Carer application not found");
      }
    } catch (error: any) {
      Logger.error("CarerDocumentService: updateShareCode", error);
      throw new Error(`Failed to update share code: ${error.message}`);
    }
  }

  public async updateNiNumber(userId: string, niNumber: string): Promise<void> {
    try {
      const result = await CarerApplication.findOneAndUpdate(
        { userId },
        { $set: { "personalInfo.nationalInsuranceNumber": niNumber } },
        { new: true }
      );
      if (!result) {
        throw new Error("Carer application not found");
      }
    } catch (error: any) {
      Logger.error("CarerDocumentService: updateNiNumber", error);
      throw new Error(`Failed to update NI number: ${error.message}`);
    }
  }
}

export default CarerDocumentService;
