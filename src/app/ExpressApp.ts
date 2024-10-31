import express, { Application } from "express";
import { Server } from "http";
import { config } from "dotenv";
import path from "path";
import fs from "fs";
import WebSocket from "ws";
import fileUpload from "express-fileupload";
import LocalConfig from "../configs/LocalConfig";
import Logger from "../logger";
import ExceptionHandler from "../exceptions/Handler";
import Http from "../middlewares/Http";
import CORS from "../middlewares/CORS";
import Morgan from "../middlewares/Morgan";
import Routes from "./Routes";
import admin from "firebase-admin";
import WebSocketApp from "./WebSocketApp";
import ResidentTaskWebSocket from "./TaskSocket";
import TimesheetWebSocketApp from "./TsSocket";

config();

/**
 * @name ExpressApp
 * @description Custom Express App Class Definition
 */
class ExpressApp {
  public express: Application;
  private _server: Server;
  private wss: WebSocket.Server;
  private wssChat: WebSocket.Server;
  private wsApp: any;
  private wssTasks: WebSocket.Server;
  // private taskCleanupJob: TaskCleanupJob;

  /**
   * Initializes the express server
   */
  constructor() {
    Logger.info("App :: Initializing...");
    // this.taskCleanupJob = new TaskCleanupJob();

    this.express = express();

    this.mountDotEnv();
    this.mountMiddlewares();
    this.mountRoutes();
    this.registerHandlers();
    // this.scheduleCleanupJob();

    // Initialize HTTP Server
    this._server = new Server(this.express);
    // Initialize WebSocketApp as a singleton
    const wsApp = WebSocketApp.getInstance();
    const wsTasks = ResidentTaskWebSocket.getInstance();
    this.wss = wsApp.getWebSocketServer();
    this.initializeFirebaseAdmin();
    this.initializeWebSockets();

    Logger.info("Jobs :: Scheduled successfully");

    Logger.info("App :: Initialized successfully");
  }
  private initializeWebSockets(): void {
    // Initialize chat WebSocket
    const wsApp = WebSocketApp.getInstance();
    wsApp._init(this._server, "/ws-chat");
    this.wssChat = wsApp.getWebSocketServer();
    Logger.info("App : Chat WebSocket server initialized on /ws-chat");

    // Initialize task WebSocket
    const wsTasks = ResidentTaskWebSocket.getInstance();
    wsTasks.init(this._server, "/ws-tasks");
    this.wssTasks = wsTasks.getWebSocketServer();
    Logger.info("App :: Task WebSocket server initialized on /ws-tasks");

    const timesheetWebSocket = TimesheetWebSocketApp.getInstance();
    timesheetWebSocket._init(this._server, "/timesheet-ws");
    Logger.info(
      "App :: Timesheet WebSocket server initialized on /timesheet-ws"
    );

    // Log client counts (if these methods are available)
    // Logger.info(`App :: Chat WebSocket client count: ${wsApp.getClientCount()}`);
    // Logger.info(`App :: Task WebSocket client count: ${wsTasks.getClientCount()}`);
  }

  /**
   * Mount all the environmental variables
   */
  private mountDotEnv(): void {
    Logger.info("Config :: Loading...");
    LocalConfig.init(this.express);
  }

  private initializeFirebaseAdmin(): void {
    Logger.info("Firebase Admin :: Initializing...");

    try {
      const serviceAccount = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../configs/wyecare-sdk.json"),
          "utf-8"
        )
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: LocalConfig.getConfig().BUCKET_NAME,
      });
      Logger.info("Firebase Admin :: Initialized  successfully");
    } catch (error: any) {
      Logger.error("Firebase Admin :: Error initializing", error);
    }
  }
  private async initializeCronJobs(): Promise<void> {}

  /**
   * Mounts all the defined middlewares
   */
  private mountMiddlewares(): void {
    Logger.info("App :: Registering middlewares...");

    // Mount basic express apis middleware
    Http.mount(this.express);

    // Registering Morgan Middleware
    Morgan.mount(this.express);

    // Check if CORS is enabled
    if (LocalConfig.getConfig().CORS_ENABLED) {
      // Mount CORS middleware
      CORS.mount(this.express);
    }

    // File upload
    this.express.use(
      fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 },
      })
    );

    Logger.info("App :: Middlewares registered");
  }

  /**
   * Register all the handlers
   */
  private registerHandlers(): void {
    Logger.info("App :: Registering handlers...");

    // Registering Exception / Error Handlers
    this.express.use(ExceptionHandler.logErrors);
    this.express.use(ExceptionHandler.clientErrorHandler);
    this.express.use(ExceptionHandler.errorHandler);
    ExceptionHandler.notFoundHandler(this.express);

    Logger.info("App :: Handlers registered");
  }

  /**
   * Mount all the routes
   */
  private mountRoutes(): void {
    this.express = Routes.mountApi(this.express);
    Logger.info("Routes :: API routes mounted");
  }

  /**
   * Starts the express server
   */
  public async _init(): Promise<void> {
    Logger.info("Server :: Starting...");

    const port = LocalConfig.getConfig().PORT || 4040;

    // Start the server on the specified port
    this._server
      .listen(port, () => {
        Logger.info(`Server :: Running @ 'http://localhost:${port}'`);
      })
      .on("error", (_error) => {
        Logger.error("Error: ", _error.message);
      });

    // Initialize cron jobs
    await this.initializeCronJobs();
  }

  /**
   * Close the express server
   */
  public close(): void {
    Logger.info("Server :: Stopping server...");

    this._server.close(() => {
      process.exit(1);
    });
  }

  public getWebSocketServer(): WebSocket.Server {
    return this.wssChat;
  }

  public getApp(): Application {
    return this.express;
  }
}

export default new ExpressApp();
