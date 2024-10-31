import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";
import { IEmail } from "src/interfaces/entities/email";
import Logger from "src/logger";
import dotenv from "dotenv";

dotenv.config();

class WyeMailer {
  private client: Client;
  private senderEmail: string;

  constructor() {
    try {
      const credential = new ClientSecretCredential(
        process.env.MAIL_CLIENT_TENENT_ID!,
        process.env.MAIL_CLIENT_ID!,
        process.env.MAIL_CLIENT_SECRET!
      );

      const authProvider = new TokenCredentialAuthenticationProvider(
        credential,
        {
          scopes: ["https://graph.microsoft.com/.default"],
        }
      );

      this.client = Client.initWithMiddleware({
        authProvider: authProvider,
      });

      this.senderEmail = process.env.MAIL_EMAIL_ADDRESS!;
      if (!this.senderEmail) {
        throw new Error(
          "MAIL_SENDER_EMAIL is not set in environment variables"
        );
      }
    } catch (error: any) {
      Logger.error(
        "WyeMailer: constructor",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  }

  public async sendMail(mailOptions: IEmail) {
    Logger.info(
      "WyeMailer: sendMail",
      "mailOptions:" + JSON.stringify(mailOptions)
    );

    console.log(
      process.env.MAIL_CLIENT_TENENT_ID,
      process.env.MAIL_CLIENT_ID,
      process.env.MAIL_CLIENT_SECRET
    );

    try {
      const sendMail = {
        message: {
          subject: mailOptions.subject,
          body: {
            contentType: "HTML",
            content: mailOptions.html || mailOptions.text,
          },
          toRecipients: [
            {
              emailAddress: {
                address: mailOptions.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      };

      await this.client
        .api(`/users/${this.senderEmail}/sendMail`)
        .post(sendMail);

      Logger.info("WyeMailer: sendMail", "Email sent successfully");
      return true;
    } catch (error: any) {
      Logger.error("WyeMailer: sendMail", "errorInfo:" + JSON.stringify(error));
      throw error;
    }
  }
}

export default WyeMailer;
