import type { Application } from "express";
import type { IEnvConfig } from "../interfaces/core/config";
import Logger from "../logger";

class LocalConfig {
  // Loading process.env as IEnvConfig interface

  public static getConfig(): IEnvConfig {
    const config = {
      PORT: parseInt(process.env["PORT"] as string, 10) || 4000,
      NODE_ENV: process.env.NODE_ENV,
      SERVER_MAINTENANCE: process.env["SERVER_MAINTENANCE"] === "true",

      MONGO_URI: process.env["MONGO_URI"],
      DB_NAME: process.env["DB_NAME"],

      API_PREFIX: process.env["API_PREFIX"] || "api/v1",

      CORS_ENABLED: process.env["CORS_ENABLED"] === "true",
      LOG_DAYS: process.env["LOG_DAYS"] || 10,

      JWT_SECRET: process.env["JWT_SECRET"],
      JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"],

      EMAIL_USER: process.env["EMAIL_USER"],
      EMAIL_PASS: process.env["EMAIL_PASS"],
      BUCKET_NAME: process.env["BUCKET_NAME"],
    };

    for (const [key, value] of Object.entries(config)) {
      if (value === undefined) {
        console.log(`Env Config :: ${key} is not defined`);
      }
    }

    return config as IEnvConfig;
  }

  /**
   * Injects your config to the app's locals
   */
  public static init(_express: Application): Application {
    _express.locals["app"] = this.getConfig();

    Logger.info("Env Config :: Loaded");
    return _express;
  }
}

export default LocalConfig;
