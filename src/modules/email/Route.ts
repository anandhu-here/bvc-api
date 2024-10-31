import { Router } from "express";
import AuthMiddleware from "src/middlewares/Auth";
import EmailController from "./EmailController";
import EmailMiddleware from "src/middlewares/email";

const EmailRouter: Router = Router();
const _emailController = new EmailController();

EmailRouter.route("/send-email").post(
  AuthMiddleware.isAuthenticatedUser,
  EmailMiddleware.validateSendEmail,
  _emailController.sendEmail
);

export default EmailRouter;
