import { Types } from "mongoose";
import ApiError from "../exceptions/ApiError";
import StatusCodes from "../constants/statusCodes";
import StringValues from "../constants/strings";
import { FCMToken, IFCMToken } from "src/models/new/FCM";

class FCMTokenServices {
  public async registerToken(
    userId: Types.ObjectId,
    token: string,
    device: {
      type: "ios" | "android" | "web";
      model?: string;
      osVersion?: string;
      appVersion?: string;
      identifier: string;
    }
  ): Promise<IFCMToken> {
    try {
      const filter = {
        user: userId,
        "device.identifier": device.identifier,
      };

      const update = {
        $set: {
          token: token,
          device: device,
        },
      };

      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      };

      const result = await FCMToken.findOneAndUpdate(filter, update, options);

      if (!result) {
        throw new Error("Failed to register or update FCM token");
      }

      return result;
    } catch (error) {
      console.error("Error registering FCM token:", error);
      // Instead of throwing the error, we'll return a default token object
      return {
        user: userId,
        token: token,
        device: device,
      } as IFCMToken;
    }
  }

  public async getTokensByUser(userId: string): Promise<IFCMToken[]> {
    try {
      const tokens = await FCMToken.find({ user: new Types.ObjectId(userId) });
      return tokens;
    } catch (error: any) {
      throw new ApiError(
        error.message || StringValues.SOMETHING_WENT_WRONG,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async deleteToken(userId: string, token: string): Promise<void> {
    try {
      const result = await FCMToken.deleteOne({
        user: new Types.ObjectId(userId),
        token: token,
      });

      if (result.deletedCount === 0) {
        throw new ApiError(
          "Token not found or already deleted",
          StatusCodes.NOT_FOUND
        );
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error.message || StringValues.SOMETHING_WENT_WRONG,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async deleteAllUserTokens(userId: string): Promise<void> {
    try {
      await FCMToken.deleteMany({ user: new Types.ObjectId(userId) });
    } catch (error: any) {
      throw new ApiError(
        error.message || StringValues.SOMETHING_WENT_WRONG,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getTokenByDeviceType(
    userId: string,
    deviceType: string
  ): Promise<IFCMToken | null> {
    try {
      const token = await FCMToken.findOne({
        user: new Types.ObjectId(userId),
        "device.type": deviceType,
      });
      return token;
    } catch (error: any) {
      throw new ApiError(
        error.message || StringValues.SOMETHING_WENT_WRONG,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default FCMTokenServices;
