import WebSocket from "ws";
import Logger from "../logger";

class WebSocketApp {
  private static instance: WebSocketApp;
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket>;

  private constructor() {
    this.clients = new Map();
  }

  public static getInstance(): WebSocketApp {
    if (!WebSocketApp.instance) {
      WebSocketApp.instance = new WebSocketApp();
    }
    return WebSocketApp.instance;
  }

  public _init = async (server: any, path: string): Promise<void> => {
    if (!this.wss) {
      this.wss = new WebSocket.Server({ server, path });
      this.wss.on("connection", (ws: WebSocket, req) => {
        const urlParams = new URLSearchParams(req.url.replace("/?", ""));
        const userId = urlParams.get("userId");
        const orgId = urlParams.get("orgId");

        if (!userId) {
          Logger.error("WebSocket :: Connection attempt without userId");
          ws.close();
          return;
        }

        const clientId = this.getClientId(userId, orgId);
        this.clients.set(clientId, ws);

        Logger.info(`WebSocket :: New connection - clientId: ${clientId}`);

        ws.on("close", () => {
          Logger.info(`WebSocket :: Connection closed - clientId: ${clientId}`);
          this.clients.delete(clientId);
        });

        ws.on("error", (error) => {
          Logger.error(
            `WebSocket :: Error for clientId ${clientId}: ${error.message}`
          );
        });
      });

      Logger.info("WebSocket :: Server initialized and listening");
    }
  };
  public broadcastMessage(message: any) {
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const [userId, clientOrgId] = clientId.split(":");
        if (!message.orgId || message.orgId === clientOrgId) {
          ws.send(JSON.stringify(message));
          Logger.info(
            `WebSocket :: Broadcast message sent to - clientId: ${clientId}`
          );
        }
      }
    });
  }

  public getWebSocketServer(): WebSocket.Server {
    return this.wss;
  }

  public sendChatMessage(message: any) {
    const receiverId = this.getClientId(message.receiver._id, message.orgId);
    const recipientWs = this.clients.get(receiverId);

    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify(message));
      Logger.info(
        `WebSocket :: Message sent to recipient - receiverId: ${receiverId}`
      );
    } else {
      Logger.warn(
        `WebSocket :: Recipient not found or not connected - receiverId: ${receiverId}`
      );
    }
  }

  private getClientId(userId: string, orgId?: string): string {
    return orgId ? `${userId}:${orgId}` : userId;
  }
}

export default WebSocketApp;
