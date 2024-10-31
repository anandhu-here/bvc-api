import { Router } from "express";
import CarerApplicationService from "src/services/CarerApplicationService";
import CarerApplicationController from "./CarerController";
import AuthMiddleware from "src/middlewares/AuthMiddleware";

const CarerApplicationRouter: Router = Router();

const carerApplicationSvc = new CarerApplicationService();
const carerApplicationCtlr = new CarerApplicationController(
  carerApplicationSvc
);

CarerApplicationRouter.use(AuthMiddleware.authenticateToken);

/**
 * @name CarerApplicationController.getApplication
 * @description Get the carer's application.
 * @route GET /api/v1/carer-application
 * @access private
 */
CarerApplicationRouter.get("/", carerApplicationCtlr.getApplication);
CarerApplicationRouter.get(
  "/agency-application",
  carerApplicationCtlr.getAgencyCarerApplications
);

/**
 * @name CarerApplicationController.uploadDocument
 * @description Upload a document for the carer's application.
 * @route POST /api/v1/carer-application/upload-document
 * @access private
 */
CarerApplicationRouter.post(
  "/upload-document",
  carerApplicationCtlr.uploadDocument
);

/**
 * @name CarerApplicationController.createOrUpdateApplication
 * @description Create or update the carer's application.
 * @route POST /api/v1/carer-application
 * @access private
 */
CarerApplicationRouter.post(
  "/",
  carerApplicationCtlr.createOrUpdateApplication
);

/**
 * @name CarerApplicationController.updateSection
 * @description Update a specific section of the carer's application.
 * @route PATCH /api/v1/carer-application/:section
 * @access private
 */
CarerApplicationRouter.patch(
  "/:section/:index",
  carerApplicationCtlr.updateSection
);

/**
 * @name CarerApplicationController.addToArray
 * @description Add an item to an array field in the carer's application.
 * @route POST /api/v1/carer-application/:arrayField
 * @access private
 */
CarerApplicationRouter.post("/:arrayField", carerApplicationCtlr.addToArray);

/**
 * @name CarerApplicationController.removeFromArray
 * @description Remove an item from an array field in the carer's application.
 * @route DELETE /api/v1/carer-application/:arrayField/:index
 * @access private
 */
CarerApplicationRouter.delete(
  "/:arrayField/:index",
  carerApplicationCtlr.removeFromArray
);

/**
 * @name CarerApplicationController.deleteDocument
 * @description Delete a document from the carer's application.
 * @route DELETE /api/v1/carer-application/document/:section/:index?
 * @access private
 */
CarerApplicationRouter.delete(
  "/document/:section/:index?",
  carerApplicationCtlr.deleteDocument
);

/**
 * @name CarerApplicationController.submitApplication
 * @description Submit the carer's application for review.
 * @route POST /api/v1/carer-application/submit
 * @access private
 */
CarerApplicationRouter.post("/submit", carerApplicationCtlr.submitApplication);

/**
 * @name CarerApplicationController.getApplicationStatus
 * @description Get the status of the carer's application.
 * @route GET /api/v1/carer-application/status
 * @access private
 */
CarerApplicationRouter.get(
  "/status",
  carerApplicationCtlr.getApplicationStatus
);

/**
 * @name CarerApplicationController.getApplicationStatusByCarerId
 * @description Get the application status for a specific carer (for admin use).
 * @route GET /api/v1/carer-application/status/:carerId
 * @access private (admin only)
 */
CarerApplicationRouter.get(
  "/status/:carerId",
  carerApplicationCtlr.getApplicationStatusByCarerId
);

export default CarerApplicationRouter;
