import { UploadedFile } from "express-fileupload";
import StringValues from "src/constants/strings";
import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/express";
import Logger from "src/logger";
import CarerDocumentService from "src/services/CarerService";

class CarerDocumentController {
  private readonly _carerDocumentService: CarerDocumentService;

  constructor() {
    this._carerDocumentService = new CarerDocumentService();
  }

  public async uploadFiles(req: Request, res: Response) {
    try {
      const carerId = req.params.carerId;
      const files = req.files;
      const { type } = req.body;

      if (!type) {
        return res
          .status(400)
          .json({ success: false, error: "No type was provided" });
      }

      if (!files || Object.keys(files).length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No files were uploaded." });
      }

      const results = [];
      for (const key in files) {
        const file = files[key] as UploadedFile;
        if (type === "document") {
          console.log(file.name, "file name");
          const document = await this._carerDocumentService.addDocument(
            carerId,
            file,
            type
          );
          results.push({ type: "document", ...document });
        } else if (type === "certificate") {
          // const { certificateTypes, expiryDates } = req.body;
          // const certificate = await this._carerDocumentService.addCertificate(
          //   carerId,
          //   file,
          //   type
          // );
          // results.push({ type: "certificate", ...certificate });
        }
      }

      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async updateShareCode(req: Request, res: Response) {
    try {
      const { carerId } = req.params;
      const { shareCode } = req.body;
      console.log(shareCode, "share code ");
      await this._carerDocumentService.updateShareCode(carerId, shareCode);
      res
        .status(200)
        .json({ success: true, message: "Share code updated successfully" });
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async updateNiNumber(req: Request, res: Response) {
    try {
      const { carerId } = req.params;
      const { niNumber } = req.body;
      await this._carerDocumentService.updateNiNumber(carerId, niNumber);
      res
        .status(200)
        .json({ success: true, message: "NI Number updated successfully" });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async getCarerDocuments(req: Request, res: Response) {
    try {
      const { carerId } = req.params;
      console.log(carerId, "carerId");
      const documents = await this._carerDocumentService.getCarerDocuments(
        carerId
      );

      res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      console.log(error, "error andi");
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async getCarerCertificates(req: Request, res: Response) {
    try {
      const { carerId } = req.params;
      console.log("carerid: ", carerId);
      // const certificates =
      //   await this._carerDocumentService.getCarerCertificates(carerId);
      res.status(200).json({ success: true, data: {} });
    } catch (error: any) {
      console.log(error, "error andi");
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }
  // public async getCarerShareCode(req: Request, res: Response) {
  //   try {
  //     const { carerId } = req.params;
  //     const shareCode = await this._carerDocumentService.getCarerShareCode(
  //       carerId
  //     );
  //     res.status(200).json({ success: true, data: shareCode });
  //   } catch (error: any) {
  //     res
  //       .status(500)
  //       .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
  //   }
  // }

  // public async getCarerNI(req: Request, res: Response) {
  //   try {
  //     const { carerId } = req.params;
  //     const niNumber = await this._carerDocumentService.getCarerNI(carerId);
  //     res.status(200).json({ success: true, data: niNumber });
  //   } catch (error: any) {
  //     res
  //       .status(500)
  //       .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
  //   }
  // }

  public async getCarerAdditionalInfo(req: Request, res: Response) {
    try {
      const { carerId } = req.params;
      const additionalInfo = {};
      res.status(200).json({ success: true, data: additionalInfo });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async deleteCarerDocument(req: Request, res: Response) {
    try {
      const { carerId, documentId, fileName } = req.params;
      // await this._carerDocumentService.deleteDocument(
      //   carerId,
      //   documentId,
      //   fileName
      // );
      res
        .status(200)
        .json({ success: true, message: "Document deleted successfully" });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }

  public async deleteCarerCertificate(req: Request, res: Response) {
    try {
      const { carerId, certificateId, fileName } = req.params;
      // await this._carerDocumentService.deleteCertificate(
      //   carerId,
      //   certificateId,
      //   fileName
      // );
      res
        .status(200)
        .json({ success: true, message: "Certificate deleted successfully" });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: StringValues.INTERNAL_SERVER_ERROR });
    }
  }
}

export default CarerDocumentController;
