import { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import ApiError from "src/exceptions/ApiError";
import type { INext } from "src/interfaces/core/express";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import Logger from "src/logger";
import type CarerApplicationService from "src/services/CarerApplicationService";
import OrganizationServices from "src/services/OrgServices";
import UserService from "src/services/UserService";

class CarerApplicationController {
  private readonly _carerApplicationSvc: CarerApplicationService;
  private readonly _userSvc: UserService;
  private readonly _orgSvc: OrganizationServices;

  constructor(carerApplicationSvc: CarerApplicationService) {
    this._carerApplicationSvc = carerApplicationSvc;
    this._userSvc = new UserService();
    this._orgSvc = new OrganizationServices();
  }

  public removeFromArray = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const { arrayField } = req.params;
      const index = parseInt(req.params.index, 10);

      if (isNaN(index) || index < 0) {
        return next(
          new ApiError("Invalid index provided", StatusCodes.BAD_REQUEST)
        );
      }

      const updatedApplication =
        await this._carerApplicationSvc.removeFromArray(
          currentUser._id.toString(),
          arrayField as any,
          index
        );

      Logger.info(
        `User ${currentUser._id} removed item from ${arrayField} at index ${index}`
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Item removed from ${arrayField} successfully`,
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: removeFromArray",
        `userId: ${req.user._id}, arrayField: ${
          req.params.arrayField
        }, index: ${req.params.index}, errorInfo: ${JSON.stringify(error)}`
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          error.statusCode || StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public deleteDocument = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user._id;
      const { section } = req.params;
      let index: number | undefined;

      if (req.params.index !== undefined) {
        const parsedIndex = Number(req.params.index);
        index = !isNaN(parsedIndex) ? parsedIndex : undefined;
      }

      const updatedApplication = await this._carerApplicationSvc.deleteDocument(
        userId.toString(),
        section,
        index
      );

      Logger.info(
        `User ${userId} deleted document from ${section}${
          index !== undefined ? ` at index ${index}` : ""
        }`
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Document deleted successfully",
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: deleteDocument",
        `userId: ${req.user._id}, section: ${req.params.section}, index: ${
          req.params.index
        }, errorInfo: ${JSON.stringify(error)}`
      );
      next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          error.statusCode || StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public getAgencyCarerApplications = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const org = req.currentOrganization;
      const carerId = req.query.carerId as string;
      const agencyOrgId = req.query.agencyOrgId as string;

      const linkedOrgs = await this._orgSvc.getLinkedOrganizations(
        org._id.toString()
      );
      if (!linkedOrgs.find((o) => o._id.toString() === agencyOrgId)) {
        return next(
          new ApiError(
            "Agency is not linked with this organization",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const application = await this._carerApplicationSvc.getApplication(
        carerId.toString(),
        agencyOrgId.toString()
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: application,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: getAgencyCarerApplications",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public getApplication = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const carerId = req.query.carerId as string;

      const currentUser = req.user;
      let userId = currentUser._id.toString();

      const org = req.currentOrganization;

      if (org) {
        if (carerId) {
          const orgRole = await this._orgSvc.getOrganizationRole(
            carerId,
            org._id.toString()
          );
          if (!orgRole) {
            return next(
              new ApiError(
                "Carer is not associated with this organization",
                StatusCodes.BAD_REQUEST
              )
            );
          } else {
            const application =
              await this._carerApplicationSvc.getApplicationFull(carerId);
            return res.status(StatusCodes.OK).json({
              success: true,
              message: StringValues.SUCCESS,
              data: application,
            });
          }
          userId = carerId;
        }
      }

      if (req.staffType === "care") {
        const application = await this._carerApplicationSvc.getApplicationFull(
          userId.toString()
        );
        return res.status(StatusCodes.OK).json({
          success: true,
          message: StringValues.SUCCESS,
          data: application,
        });
      }

      const application = await this._carerApplicationSvc.getApplication(
        userId.toString(),
        req.currentOrganization.id.toString()
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: application,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: getApplication",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public createOrUpdateApplication = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const applicationData = req.body;

      const org = req.currentOrganization;

      if (currentUser.role !== "carer") {
        return next(
          new ApiError(
            "Only carer can create application",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const updatedApplication =
        await this._carerApplicationSvc.createOrUpdateApplication(
          currentUser._id.toString(),
          applicationData
        );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: createOrUpdateApplication",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public updateSection = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const { section } = req.params;
      const sectionData = req.body;

      let index: number | undefined;
      if (req.params.index !== undefined) {
        const parsedIndex = Number(req.params.index);
        if (
          !isNaN(parsedIndex) &&
          Number.isInteger(parsedIndex) &&
          parsedIndex >= 0
        ) {
          index = parsedIndex;
        }
      }

      console.log(index, "---");

      const updatedApplication = await this._carerApplicationSvc.updateSection(
        currentUser._id.toString(),
        section as any,
        sectionData,
        index
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: updateSection",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public addToArray = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const { arrayField } = req.params;
      const item = req.body;

      const updatedApplication = await this._carerApplicationSvc.addToArray(
        currentUser._id.toString(),
        arrayField as any,
        item
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: addToArray",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public submitApplication = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;

      const submittedApplication =
        await this._carerApplicationSvc.submitApplication(
          currentUser._id.toString()
        );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: submittedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: submitApplication",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public uploadDocument = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const file = req.files?.file;
      const section = req.body?.section;
      const documentType = req.body?.documentType;
      let index: number | undefined;
      if (req.body.index !== undefined) {
        const parsedIndex = Number(req.body.index);
        if (
          !isNaN(parsedIndex) &&
          Number.isInteger(parsedIndex) &&
          parsedIndex >= 0
        ) {
          index = parsedIndex;
        }
      }

      if (!file) {
        return next(new ApiError("No file found", StatusCodes.BAD_REQUEST));
      }

      if (!section) {
        return next(
          new ApiError("Section is required", StatusCodes.BAD_REQUEST)
        );
      }

      const updatedApplication = await this._carerApplicationSvc.uploadDocument(
        currentUser._id.toString(),
        file,
        section,
        documentType,
        typeof index === "number" ? index : undefined
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Document uploaded successfully",
        data: updatedApplication,
      });
    } catch (error: any) {
      console.log(error);
      Logger.error(
        "CarerApplicationController: uploadDocument",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public uploadDocuments = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const currentUser = req.user;
      const files = req.files as { [fieldname: string]: any };
      const formData = req.body;

      if (!files || Object.keys(files).length === 0) {
        return next(new ApiError("No files found", StatusCodes.BAD_REQUEST));
      }

      const updatedApplication =
        await this._carerApplicationSvc.uploadDocuments(
          currentUser._id.toString(),
          files,
          formData
        );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: updatedApplication,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: uploadDocuments",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  public getApplicationStatusByCarerId = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<any> => {
    try {
      const carerId = req.query.carerId as string;

      // const status = await this._carerApplicationSvc.getApplicationStatus(
      //   carerId
      // );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: {},
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: getApplicationStatusByCarerId",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };

  // status
  public getApplicationStatus = async (
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user._id.toString();
      const status = await this._carerApplicationSvc.getApplicationStatus(
        userId
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: status,
      });
    } catch (error: any) {
      Logger.error(
        "CarerApplicationController: getApplicationStatus",
        "errorInfo:" + JSON.stringify(error)
      );
      next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  };
}

export default CarerApplicationController;
