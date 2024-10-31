import { Router } from "express";
import InvoiceController from "./InvoiceController";
import AuthMiddleware from "src/middlewares/Auth";
import PaymentMiddleware from "src/middlewares/Payment";

const InvoiceRouter: Router = Router();
const _invoiceController = new InvoiceController();

/**
 * @name InvoiceController.createInvoice
 * @description Create a new invoice
 * @route POST /api/v1/invoices
 * @access private
 */
InvoiceRouter.route("/").post(
  AuthMiddleware.isAuthenticatedUser,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  PaymentMiddleware.requireActiveSubscription,
  _invoiceController.createInvoice
);

/**
 * @name InvoiceController.getInvoices
 * @description Get all invoices for the agency
 * @route GET /api/v1/invoices
 * @access private
 */
InvoiceRouter.route("/").get(
  AuthMiddleware.isAuthenticatedUser,
  _invoiceController.getInvoices
);

/**
 * @name InvoiceController.getInvoiceById
 * @description Get a specific invoice by ID
 * @route GET /api/v1/invoices/:invoiceId
 * @access private
 */
InvoiceRouter.route("/:invoiceId").get(
  AuthMiddleware.isAuthenticatedUser,
  _invoiceController.getInvoiceById
);

/**
 * @name InvoiceController.updateInvoiceStatus
 * @description Update the status of an invoice
 * @route PUT /api/v1/invoices/:invoiceId/status
 * @access private
 */
InvoiceRouter.route("/:invoiceId/status").patch(
  AuthMiddleware.isAuthenticatedUser,
  _invoiceController.updateInvoiceStatus
);

export default InvoiceRouter;
