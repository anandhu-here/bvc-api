import { Router } from "express";
import fileUpload from "express-fileupload";
import ProfilePictureService from "src/services/PictureService";
import PictureController from "./PictureController";
import AuthMiddleware from "src/middlewares/AuthMiddleware";

const PictureRouter: Router = Router();
const _profilePictureService = new ProfilePictureService();
const profilePictureController = new PictureController();

PictureRouter.use(AuthMiddleware.authenticateToken);

/**
 * @name ProfilePictureController.uploadProfilePicture
 * @description Upload a profile picture for a user.
 * @route POST /api/v1/profile-picture/:userId/upload
 * @access private
 */
PictureRouter.route("/:userId/upload").post(
  profilePictureController.uploadProfilePicture.bind(profilePictureController)
);

PictureRouter.route("/organization/:orgId/upload").post(
  profilePictureController.uploadOrgLogo.bind(profilePictureController)
);

/**
 * @name ProfilePictureController.deleteProfilePicture
 * @description Delete the profile picture of a user.
 * @route DELETE /api/v1/profile-picture/:userId/delete
 * @access private
 */
PictureRouter.route("/:userId/delete").delete(
  profilePictureController.deleteProfilePicture.bind(profilePictureController)
);

/**
 * @name ProfilePictureController.getProfilePictureUrl
 * @description Get the profile picture URL of a user.
 * @route GET /api/v1/profile-picture/:userId/url
 * @access private
 */
PictureRouter.route("/:userId/url").get(
  profilePictureController.getProfilePictureUrl.bind(profilePictureController)
);

export default PictureRouter;
