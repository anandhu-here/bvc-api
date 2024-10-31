import { Router } from "express";
import fileUpload from "express-fileupload";
import CarerDocumentController from "./CarerDocController";
import CarerDocumentService from "src/services/CarerService";
import AuthMiddleware from "src/middlewares/AuthMiddleware";

const CarerDocumentRouter: Router = Router();
const _carerDocumentService = new CarerDocumentService();
const carerDocumentController = new CarerDocumentController();

/**
 * @name CarerDocumentController.uploadFiles
 * @description Upload documents and certificates for a carer.
 * @route POST /api/v1/carer-documents/:carerId/upload
 * @access private
 */

CarerDocumentRouter.route("/:carerId/upload").post(
  AuthMiddleware.authenticateToken,
  carerDocumentController.uploadFiles.bind(carerDocumentController)
);

/**
 * @name CarerDocumentController.updateShareCode
 * @description Update share code for a carer's documents.
 * @route PATCH /api/v1/carer-documents/:carerId/share-code
 * @access private
 */
CarerDocumentRouter.route("/:carerId/share-code").patch(
  AuthMiddleware.authenticateToken,
  carerDocumentController.updateShareCode.bind(carerDocumentController)
);

/**
 * @name CarerDocumentController.updateNiNumber
 * @description Update NI number for a carer's documents.
 * @route PATCH /api/v1/carer-documents/:carerId/ni-number
 * @access private
 */
CarerDocumentRouter.route("/:carerId/ni-number").patch(
  AuthMiddleware.authenticateToken,
  carerDocumentController.updateNiNumber.bind(carerDocumentController)
);

/**
 * @name CarerDocumentController.getCarerDocuments
 * @description Get all documents for a carer.
 * @route GET /api/v1/carer-documents/:carerId/documents
 * @access private
 */
CarerDocumentRouter.route("/:carerId/documents").get(
  AuthMiddleware.authenticateToken,
  carerDocumentController.getCarerDocuments.bind(carerDocumentController)
);

/**
 * @name CarerDocumentController.getCarerCertificates
 * @description Get all certificates for a carer.
 * @route GET /api/v1/carer-documents/:carerId/certificates
 * @access private
 */
CarerDocumentRouter.route("/:carerId/certificates").get(
  AuthMiddleware.authenticateToken,
  carerDocumentController.getCarerCertificates.bind(carerDocumentController)
);

CarerDocumentRouter.route("/:carerId/additional-info").get(
  AuthMiddleware.authenticateToken,
  carerDocumentController.getCarerAdditionalInfo.bind(carerDocumentController)
);

CarerDocumentRouter.route(
  "/:carerId/document/:documentId/file/:fileName"
).delete(
  AuthMiddleware.authenticateToken,
  carerDocumentController.deleteCarerDocument.bind(carerDocumentController)
);

CarerDocumentRouter.route(
  "/:carerId/certificate/:certificateId/file/:fileName"
).delete(
  AuthMiddleware.authenticateToken,
  carerDocumentController.deleteCarerCertificate.bind(carerDocumentController)
);

export default CarerDocumentRouter;
