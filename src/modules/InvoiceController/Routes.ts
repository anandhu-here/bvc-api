import { Router } from "express";
import InvoiceController from "./InvoiceController";
import PaymentMiddleware from "src/middlewares/Payment";
import AuthMiddleware from "src/middlewares/AuthMiddleware";

const InvoiceRouter: Router = Router();
const _invoiceController = new InvoiceController();

InvoiceRouter.use(AuthMiddleware.authenticateToken);

/**
 * @name InvoiceController.createInvoice
 * @description Create a new invoice
 * @route POST /api/v1/invoices
 * @access private
 */
InvoiceRouter.route("/").post(_invoiceController.createInvoice);

InvoiceRouter.route("/calculate").get(_invoiceController.calculateInvoice);

/**
 * @name InvoiceController.getInvoices
 * @description Get all invoices for the agency
 * @route GET /api/v1/invoices
 * @access private
 */
InvoiceRouter.route("/").get(_invoiceController.getInvoices);

/**
 * @name InvoiceController.getInvoiceById
 * @description Get a specific invoice by ID
 * @route GET /api/v1/invoices/:invoiceId
 * @access private
 */
InvoiceRouter.route("/:invoiceId").get(_invoiceController.getInvoiceById);

/**
 * @name InvoiceController.updateInvoiceStatus
 * @description Update the status of an invoice
 * @route PUT /api/v1/invoices/:invoiceId/status
 * @access private
 */
InvoiceRouter.route("/:invoiceId/status").patch(
  _invoiceController.updateInvoiceStatus
);

export default InvoiceRouter;
