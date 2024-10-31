import { UploadedFile } from "express-fileupload";
import ProfilePictureService from "src/services/PictureService";
import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import StringValues from "src/constants/strings";

class PictureController {
  private readonly _profilePictureService: ProfilePictureService;

  constructor() {
    this._profilePictureService = new ProfilePictureService();
  }
  public async uploadOrgLogo(req: Request, res: Response) {
    try {
      const orgId = req.params.orgId;
      const files = req.files;

      if (!files || Object.keys(files).length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No files were uploaded." });
      }

      const file = files.file as UploadedFile;
      const logoUrl = await this._profilePictureService.uploadOrgLogo(
        orgId,
        file
      );

      res.status(200).json({
        success: true,
        data: {
          logoUrl: logoUrl,
        },
      });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async uploadProfilePicture(req: Request, res: Response) {
    try {
      const userId = req.user._id; // Assuming you have authentication middleware that sets req.user
      const files = req.files;

      if (!files || Object.keys(files).length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No files were uploaded." });
      }

      const file = files.file as UploadedFile;
      const avatarUrl = await this._profilePictureService.uploadProfilePicture(
        userId.toString().toString(),
        file
      );

      res.status(200).json({
        success: true,
        data: {
          avatarUrl: avatarUrl,
        },
      });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async deleteProfilePicture(req: Request, res: Response) {
    try {
      const userId = req.user._id; // Assuming you have authentication middleware that sets req.user
      await this._profilePictureService.deleteProfilePicture(userId.toString());
      res.status(200).json({
        success: true,
        message: "Profile picture deleted successfully",
      });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async getProfilePictureUrl(req: Request, res: Response) {
    try {
      const userId = req.params.userId || req.user._id; // Allow getting URL for any user, defaulting to the authenticated user
      const url = await this._profilePictureService.getProfilePictureUrl(
        userId.toString()
      );
      res.status(200).json({ success: true, data: { url } });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }
}

export default PictureController;
