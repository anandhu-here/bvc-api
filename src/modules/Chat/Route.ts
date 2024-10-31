import { Router } from "express";
import ChatController from "./ChatController";
import AuthMiddleware from "src/middlewares/AuthMiddleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateToken);

// Message sending routes
router.post("/", ChatController.sendMessage);
router.post("/global", ChatController.sendGlobalMessage);
router.post("/broadcast", ChatController.broadcastMessage);

// Message retrieval routes
router.get("/history/:otherUserId", ChatController.getMessages);
router.get("/global/:homeId", ChatController.getGlobalMessages);
router.get("/broadcast", ChatController.getBroadcastMessages);

// Message status routes
router.put("/read/:messageId", ChatController.markAsRead);
router.put("/read-all/:otherUserId", ChatController.markAllAsRead);
router.get("/unread/count", ChatController.getUnreadCount);

export default router;
