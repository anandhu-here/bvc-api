import WebSocket from "ws";
import Logger from "../logger";
import { Types } from "mongoose";

interface TaskUpdate {
  taskId: string;
  residentId: string;
  orgId: string;
  status: "upcoming" | "pending" | "completed" | "overdue" | "missed" | "idle";
  updatedBy: string;
  summary?: any;
}

function extractParamsFromURL(url) {
  const parsedUrl = new URL(url, "http://dummy-base.com");
  const searchParams = new URLSearchParams(parsedUrl.search);

  const userId = searchParams.get("userId");
  const orgId = searchParams.get("orgId");

  return { userId, orgId };
}

class ResidentTaskWebSocket {
  private static instance: ResidentTaskWebSocket;
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket>;

  private constructor() {
    this.clients = new Map();
  }

  public static getInstance(): ResidentTaskWebSocket {
    if (!ResidentTaskWebSocket.instance) {
      ResidentTaskWebSocket.instance = new ResidentTaskWebSocket();
    }
    return ResidentTaskWebSocket.instance;
  }

  public init = async (server: any, path: string): Promise<void> => {
    if (!this.wss) {
      this.wss = new WebSocket.Server({ server, path });
      this.wss.on("connection", (ws: WebSocket, req) => {
        console.log("req.url", req.url);
        const { userId, orgId } = extractParamsFromURL(req.url);

        if (!userId || !orgId) {
          Logger.error(
            "ResidentTaskWebSocket :: Connection attempt without userId or orgId"
          );
          ws.close();
          return;
        }

        const clientId = this.getClientId(userId, orgId);
        console.log("clientId", clientId);
        this.clients.set(clientId, ws);

        console.log("this.clients", this.clients);

        Logger.info(
          `ResidentTaskWebSocket :: New connectionmmmmmmmmm - clientId: ${clientId}`
        );

        ws.on("message", (message: string) => {
          this.handleMessage(clientId, message);
        });

        ws.on("close", () => {
          Logger.info(
            `ResidentTaskWebSocket :: Connection closed - clientId: ${clientId}`
          );
          this.clients.delete(clientId);
        });

        ws.on("error", (error) => {
          Logger.error(
            `ResidentTaskWebSocket :: Error for clientId ${clientId}: ${error.message}`
          );
        });
      });

      Logger.info("ResidentTaskWebSocket :: Server initialized and listening");
    }
  };

  private handleMessage(clientId: string, message: string) {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === "taskUpdate") {
        this.broadcastTaskUpdate(parsedMessage.data);
      }
    } catch (error) {
      Logger.error(
        `ResidentTaskWebSocket :: Error parsing message from clientId ${clientId}: ${error.message}`
      );
    }
  }

  public broadcastTaskUpdate(taskUpdate: TaskUpdate) {
    console.log("this.clients", this.clients);
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const [userId, clientOrgId] = clientId.split(":");
        if (taskUpdate.orgId === clientOrgId) {
          ws.send(JSON.stringify({ type: "taskUpdate", data: taskUpdate }));
          Logger.info(
            `ResidentTaskWebSocket :: Task update broadcast to - clientId: ${clientId}`
          );
        }
      }
    });
  }

  public sendResidentTaskSummary(
    orgId: string,
    residentId: string,
    summary: any
  ) {
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const [userId, clientOrgId] = clientId.split(":");
        if (orgId === clientOrgId) {
          ws.send(
            JSON.stringify({
              type: "residentTaskSummary",
              data: { residentId, summary },
            })
          );
          Logger.info(
            `ResidentTaskWebSocket :: Resident task summary sent to - clientId: ${clientId}`
          );
        }
      }
    });
  }

  public getWebSocketServer(): WebSocket.Server {
    return this.wss;
  }

  private getClientId(userId: string, orgId: string): string {
    return `${userId}:${orgId}`;
  }
}

export default ResidentTaskWebSocket;
