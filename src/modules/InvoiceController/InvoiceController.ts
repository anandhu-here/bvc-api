import type { NextFunction } from "express";
import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import ApiError from "src/exceptions/ApiError";
import type {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/express";
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
  ): Promise<any> => {
    try {
      const { homeId, startDate, endDate, shiftSummary } = req.body;
      const agencyId = req.currentUser._id.toString().toString();

      const invoice = await this._invoiceSvc.createInvoice(
        agencyId,
        homeId,
        startDate,
        endDate,
        shiftSummary
      );

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error: any) {
      Logger.error(
        "InvoiceController: createInvoice",
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

  public getInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const userId = req.currentUser._id.toString();
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

      const currentUser = req.currentUser;
      if (currentUser.accountType === "home") {
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
}

export default InvoiceController;
