/**
 * Define JWT Helper Class
 */

import jwt from "jsonwebtoken";
import LocalConfig from "../configs/LocalConfig";
import Logger from "../logger";
import Strings from "../constants/strings";
import invitations from "src/models/invitations";

class TokenServiceHelper {
  /**
   * @name verifyToken
   * @description Verify Jwt Token.
   * @param token
   * @returns JwtPayload | undefined
   */
  public static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, LocalConfig.getConfig().JWT_SECRET!);

      if (!decoded || typeof decoded === "string") {
        throw new Error(Strings.TOKEN_NOT_VERIFIED);
      }

      const invitation = await invitations.findOne({
        invToken: token,
      });

      if (!invitation) {
        Logger.error(Strings.TOKEN_NOT_FOUND);
        return null;
      }

      return {
        invitation,
        decoded,
      };
    } catch (error: any) {
      Logger.error(error.message);
      return null;
    }
  }

  /**
   * @name isTokenExpired
   * @description Check if token is expired or not.
   * @param expiresAt
   * @returns boolean
   */
  public static async isTokenExpired(expiresAt: number): Promise<boolean> {
    if (expiresAt < new Date().getTime() / 1000) {
      return true;
    }

    return false;
  }
}

export default TokenServiceHelper;
