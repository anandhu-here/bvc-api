import WebSocket from "ws";
import User from "../models/User";
import type { IUser } from "../interfaces/entities/user";
import Logger from "../logger";
import App from "src/app";
import ExpressApp from "src/app/ExpressApp";

class WebSocketServices {
  private wss: WebSocket.Server;

  constructor() {}

  public async emitMessage(type: string, data: any) {
    try {
      const message = JSON.stringify({ type, data });

      this.wss.emit(type, message);
    } catch (error: any) {
      Logger.error("Error sending message:", error);
      throw error;
    }
  }

  public async emitMessageToUsers(
    userIds: string[],
    message: string
  ): Promise<void> {
    try {
      const connections = await this.getUserConnections(userIds);

      for (const { ws } of connections) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    } catch (error: any) {
      Logger.error("Error sending message:", error);
      throw error;
    }
  }

  private async getUserConnections(
    userIds: string[]
  ): Promise<{ userId: string; ws: WebSocket }[]> {
    const users = await User.find({ _id: { $in: userIds } }).exec();

    return users.map((user) => ({
      userId: user._id.toString(),
      ws:
        Array.from(this.wss.clients).find(
          (ws) => (ws as any).userId === user._id.toString()
        ) || null,
    }));
  }
}

export default WebSocketServices;
