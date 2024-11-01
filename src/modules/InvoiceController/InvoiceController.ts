import type { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import ApiError from "src/exceptions/ApiError";
import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import Logger from "src/logger";
import InvoiceService from "src/services/InvoiceService";

class InvoiceController {
  private readonly _invoiceSvc: InvoiceService;

  constructor() {
    this._invoiceSvc = new InvoiceService();
  }

  public createInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        homeId,
        startDate,
        endDate,
        timesheets,
        totalAmount,
        shiftSummary,
      } = req.body;

      const agencyId = req.currentOrganization?._id.toString();

      if (!homeId || !startDate || !endDate || !agencyId || !timesheets) {
        throw new ApiError("Missing required fields", StatusCodes.BAD_REQUEST);
      }

      const invoice = await this._invoiceSvc.createInvoice({
        agencyId,
        homeId,
        startDate,
        endDate,
        timesheets,
        totalAmount,
        shiftSummary,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error: any) {
      Logger.error("InvoiceController: createInvoice:", error);
      return next(
        new ApiError(
          error.message || "Failed to create invoice",
          error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  };

  public getInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const userId = req.user._id.toString();
      const invoices = await this._invoiceSvc.getInvoices(userId);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: invoices,
      });
    } catch (error: any) {
      Logger.error(
        "InvoiceController: getInvoices",
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

  public getInvoiceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const { invoiceId } = req.params;
      const invoice = await this._invoiceSvc.getInvoiceById(invoiceId);

      if (!invoice) {
        return next(new ApiError("Invoice not found", StatusCodes.NOT_FOUND));
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: StringValues.SUCCESS,
        data: invoice,
      });
    } catch (error: any) {
      Logger.error(
        "InvoiceController: getInvoiceById",
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

  public updateInvoiceStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const { invoiceId } = req.params;
      const { status } = req.body;

      const currentUser = req.user;
      if (currentUser.role === "home") {
        if (status !== "accepted") {
          return next(
            new ApiError(
              "You can only accept an invoice",
              StatusCodes.BAD_REQUEST
            )
          );
        }
      }

      const updatedInvoice = await this._invoiceSvc.updateInvoiceStatus(
        invoiceId,
        status
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Invoice status updated successfully",
        data: updatedInvoice,
      });
    } catch (error: any) {
      Logger.error(
        "InvoiceController: updateInvoiceStatus",
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

  //calculations
  public calculateInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { homeId } = req.query;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const agencyId = req.currentOrganization._id.toString();

      if (!homeId || !startDate || !endDate || !agencyId) {
        throw new ApiError(
          "Missing required parameters",
          StatusCodes.BAD_REQUEST
        );
      }

      const calculationResult = await this._invoiceSvc.calculateInvoiceSummary(
        agencyId,
        homeId as string,
        startDate,
        endDate
      );

      res.status(StatusCodes.OK).json(calculationResult);
    } catch (error: any) {
      Logger.error(
        "InvoiceController: calculateInvoice",
        "errorInfo:" + JSON.stringify(error)
      );
      return next(
        new ApiError(
          error.message || StringValues.SOMETHING_WENT_WRONG,
          error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  };
}

export default InvoiceController;
