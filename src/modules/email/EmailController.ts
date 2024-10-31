import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import CustomError from "src/helpers/ErrorHelper";
import { IRequest, IResponse } from "src/interfaces/core/express";
import Logger from "src/logger";
import EmailServices from "src/services/EmailService";
import { getHomeTemplate } from "./templates/toHome";
import UserService from "src/services/UserService";
import { getCarerTemplate } from "./templates/toCarer";
const nodemailer = require("nodemailer");

class EmailController {
  private readonly emailService: EmailServices;
  private readonly transporter: any;
  private readonly userSvc: UserService;
  constructor() {
    this.emailService = new EmailServices();
    console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS, "email, pass");
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    this.userSvc = new UserService();
  }

  public sendEmail = async (req: IRequest, res: IResponse) => {
    try {
      const { to, subject, text } = req.body;

      const user = req.currentUser;
      const toUser = await this.userSvc.findUserByEmailExc(to);
      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: StringValues.UNAUTHORIZED });
      }
      let template = getHomeTemplate(
        `wyecare.com/accept-invitations?from=${user.email}`
      );

      if (["carer", "nurse"].includes(toUser.accountType)) {
        template = getCarerTemplate(
          `wyecare.com/accept-invitations?from=${user.email}`
        );
      }

      //   await this.emailService.sendEmail({
      //     from: user.email,
      //     to,
      //     subject,
      //     text,
      //     html: template,
      //   });
      return res
        .status(StatusCodes.OK)
        .json({ message: "Email sent successfully" });
    } catch (error: any) {
      console.log(error, "error email");
      return res.status(500).json({
        message:
          error instanceof CustomError
            ? error.message
            : StringValues.SOMETHING_WENT_WRONG,
      });
    }
  };
}

export default EmailController;
