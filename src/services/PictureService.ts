import admin from "firebase-admin";
import { UploadedFile } from "express-fileupload";
import { IUser, User } from "src/models/new/Heirarchy";

class ProfilePictureService {
  private bucket: string;

  constructor() {
    this.bucket = process.env.BUCKET;
  }

  private async deleteFile(fileName: string): Promise<void> {
    if (admin.apps.length === 0) {
      throw new Error("Firebase Admin SDK not initialized");
    }

    try {
      const bucket = admin.storage().bucket(this.bucket);
      const file = bucket.file(fileName);
      await file.delete();
    } catch (error: any) {
      console.error("Error in deleteFile:", error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  private async uploadFile(
    file: UploadedFile,
    fileName: string
  ): Promise<string> {
    if (admin.apps.length === 0) {
      throw new Error("Firebase Admin SDK not initialized");
    }

    try {
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
      console.error("Error in uploadFile:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  public async uploadOrgLogo(
    orgId: string,
    file: UploadedFile | undefined
  ): Promise<string> {
    if (!file) {
      throw new Error("No file was uploaded");
    }

    try {
      const fileName = `org_logos/${orgId}_${file.name}`;
      const url = await this.uploadFile(file, fileName);

      // Update org's logo
      const org = await Organization.findByIdAndUpdate(orgId, {
        logoUrl: url,
      });
      if (!org) {
        throw new Error("Organization not found");
      }

      return url;
    } catch (error: any) {
      console.error("Error in uploadOrgLogo:", error);
      throw new Error(`Failed to upload org logo: ${error.message}`);
    }
  }

  public async uploadProfilePicture(
    userId: string,
    file: UploadedFile | undefined
  ): Promise<string> {
    if (!file) {
      throw new Error("No file was uploaded");
    }

    try {
      const fileName = `profile_pictures/${userId}_${file.name}`;
      const url = await this.uploadFile(file, fileName);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Update user's avatar
      user.avatarUrl = url;
      await user.save();

      return url;
    } catch (error: any) {
      console.error("Error in uploadProfilePicture:", error);
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  }

  // public async uploadResidentProfilePicture(
  //   residentId: string,
  //   file: UploadedFile | undefined
  // ): Promise<string> {
  //   if (!file) {
  //     throw new Error("No file was uploaded");
  //   }

  //   try {
  //     const fileName = `profile_pictures/${residentId}_${file.name}`;
  //     const url = await this.uploadFile(file, fileName);

  //     const resident = await Resident.findById(residentId);
  //     if (!resident) {
  //       throw new Error("User not found");
  //     }

  //     // Update user's avatar
  //     resident.profilePictureUrl = url;
  //     await resident.save();

  //     return url;
  //   } catch (error: any) {
  //     console.error("Error in uploadResidentProfilePicture:", error);
  //     throw new Error(
  //       `Failed to upload resident profile picture: ${error.message}`
  //     );
  //   }
  // }

  public async deleteProfilePicture(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.avatarUrl) {
        await this.deleteFile(user.avatarUrl);
      }

      // Remove avatar from user
      user.avatarUrl = undefined;
      await user.save();

      return user as any;
    } catch (error: any) {
      console.error("Error in deleteProfilePicture:", error);
      throw new Error(`Failed to delete profile picture: ${error.message}`);
    }
  }

  public async getProfilePictureUrl(userId: string): Promise<string | null> {
    try {
      const user = await User.findById(userId);
      return user && user.avatarUrl ? user.avatarUrl : null;
    } catch (error: any) {
      console.error("Error in getProfilePictureUrl:", error);
      throw new Error(`Failed to get profile picture URL: ${error.message}`);
    }
  }
}

export default ProfilePictureService;
