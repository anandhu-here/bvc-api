import WyeMailer from "src/app/Services/email.service";
import { IEmail } from "src/interfaces/entities/email";
import Logger from "src/logger";

class EmailServices {
  private readonly mailer: WyeMailer;

  constructor() {
    this.mailer = new WyeMailer();
  }

  public sendEmail = async (emailOptions: IEmail): Promise<boolean> => {
    try {
      Logger.info(
        "EmailServices: sendEmail",
        "Sending email with options: " + JSON.stringify(emailOptions)
      );

      const mailOptions: IEmail = {
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      };

      await this.mailer.sendMail(mailOptions);

      Logger.info("EmailServices: sendEmail", "Email sent successfully");
      return true;
    } catch (error: any) {
      Logger.error(
        "EmailServices: sendEmail",
        `Failed to send email: ${error.message}`
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }
  };
}

export default EmailServices;
