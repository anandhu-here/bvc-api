import WebSocket from "ws";
import Logger from "../logger";

function extractParamsFromURL(url: string) {
  try {
    const parsedUrl = new URL(url, "http://dummy-base.com");
    const searchParams = new URLSearchParams(parsedUrl.search);

    const userId = searchParams.get("userId");
    const orgId = searchParams.get("orgId");

    Logger.info(`Extracted params - userId: ${userId}, orgId: ${orgId}`);
    return { userId, orgId };
  } catch (error) {
    Logger.error(`Error extracting params from URL: ${url}`, error);
    return { userId: null, orgId: null };
  }
}

class TimesheetWebSocketApp {
  private static instance: TimesheetWebSocketApp;
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket>;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.clients = new Map();
  }

  public static getInstance(): TimesheetWebSocketApp {
    if (!TimesheetWebSocketApp.instance) {
      TimesheetWebSocketApp.instance = new TimesheetWebSocketApp();
    }
    return TimesheetWebSocketApp.instance;
  }

  private setupHeartbeat() {}

  public _init = async (server: any, path: string): Promise<void> => {
    if (!this.wss) {
      this.wss = new WebSocket.Server({ server, path });

      this.wss.on("error", (error) => {
        Logger.error("WebSocket Server Error:", error);
      });

      this.wss.on("connection", (ws: WebSocket, req) => {
        Logger.info(`New WebSocket connection attempt from ${req.url}`);

        const { userId, orgId } = extractParamsFromURL(req.url || "");

        if (!userId || !orgId) {
          Logger.error("Connection attempt without required parameters");
          ws.close();
          return;
        }

        // Set up connection monitoring
        (ws as any).isAlive = true;
        ws.on("pong", () => {
          (ws as any).isAlive = true;
        });

        const clientId = this.getClientId(userId, orgId);
        this.clients.set(clientId, ws);

        Logger.info(`New connection established - clientId: ${clientId}`);
        Logger.info(`Total active connections: ${this.clients.size}`);

        this.clients.forEach((_, id) => {
          Logger.info(`Active connection: ${id}`);
        });

        ws.on("message", (message: WebSocket.Data) => {
          try {
            const parsedMessage = JSON.parse(message.toString());
            Logger.info(`Received message from ${clientId}:`, parsedMessage);
          } catch (error) {
            Logger.error(`Error parsing message from ${clientId}:`, error);
          }
        });

        ws.on("close", () => {
          Logger.info(`Connection closed - clientId: ${clientId}`);
          this.clients.delete(clientId);
          Logger.info(`Remaining connections: ${this.clients.size}`);
        });

        ws.on("error", (error) => {
          Logger.error(`Error for clientId ${clientId}:`, error);
        });

        try {
          ws.send(
            JSON.stringify({
              type: "CONNECTION_ESTABLISHED",
              payload: { clientId, timestamp: new Date() },
            })
          );
        } catch (error) {
          Logger.error(
            `Error sending connection confirmation to ${clientId}:`,
            error
          );
        }
      });

      this.setupHeartbeat();
      Logger.info(`WebSocket server initialized on path: ${path}`);
    }
  };

  public broadcastTimesheetScan(message: {
    barcode: string;
    carerId: string;
    orgId: string;
    timestamp: Date;
    status: "scanned" | "processed" | "error";
    error?: string;
  }) {
    Logger.info("Broadcasting timesheet scan:", message);
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const [_, clientOrgId] = clientId.split(":");
        if (message.orgId === clientOrgId) {
          try {
            ws.send(
              JSON.stringify({
                type: "TIMESHEET_SCAN",
                payload: message,
              })
            );
            Logger.info(`Scan notification sent to - clientId: ${clientId}`);
          } catch (error) {
            Logger.error(
              `Error sending scan notification to ${clientId}:`,
              error
            );
          }
        }
      }
    });
  }

  public notifyTimesheetProcessed(message: {
    barcode: string;
    carerId: string;
    orgId: string;
    timestamp: Date;
    timesheetId: string;
    status: "success" | "error" | "rejected" | "processing";
    error?: string;
  }) {
    Logger.info(
      `Attempting to notify timesheet processed for carerId: ${message.carerId}`
    );
    Logger.info(`Current active connections: ${this.clients.size}`);

    const carerClientId = this.getClientId(message.carerId, message.orgId);
    Logger.info(`Looking for client with ID: ${carerClientId}`);

    const carerWs = this.clients.get(carerClientId);

    if (!carerWs) {
      Logger.warn(`No active connection found for carerId: ${message.carerId}`);
      return;
    }

    if (carerWs.readyState === WebSocket.OPEN) {
      try {
        carerWs.send(
          JSON.stringify({
            type: "TIMESHEET_PROCESSED",
            payload: message,
          })
        );
        Logger.info(
          `Notification sent successfully to carer: ${message.carerId}`
        );
      } catch (error) {
        Logger.error(
          `Error sending notification to carer ${message.carerId}:`,
          error
        );
      }
    } else {
      Logger.warn(
        `Connection not open for carerId: ${message.carerId}, state: ${carerWs.readyState}`
      );
      this.clients.delete(carerClientId);
    }

    // Broadcast to admins even if carer notification fails
    this.broadcastToAdmins(message);
  }

  private broadcastToAdmins(message: any) {
    Logger.info(`Broadcasting to admins for org: ${message.orgId}`);
    let adminNotificationCount = 0;

    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const [userId, clientOrgId] = clientId.split(":");
        if (message.orgId === clientOrgId && userId !== message.carerId) {
          try {
            ws.send(
              JSON.stringify({
                type: "TIMESHEET_ADMIN_NOTIFICATION",
                payload: message,
              })
            );
            adminNotificationCount++;
            Logger.info(`Admin notification sent to: ${clientId}`);
          } catch (error) {
            Logger.error(
              `Error sending admin notification to ${clientId}:`,
              error
            );
          }
        }
      } else {
        Logger.warn(`Removing stale connection for ${clientId}`);
        this.clients.delete(clientId);
      }
    });

    Logger.info(`Admin notifications sent: ${adminNotificationCount}`);
  }

  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.clients.clear();
    Logger.info("WebSocket server cleaned up");
  }

  private getClientId(userId: string, orgId: string): string {
    return `${userId}:${orgId}`;
  }
}

export default TimesheetWebSocketApp;
