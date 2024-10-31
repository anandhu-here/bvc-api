import express from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import HistoricNotificationController from "./Historic";

const router = express.Router();
const historicNotificationController = new HistoricNotificationController();

// Use authentication middleware for all routes
router.use(AuthMiddleware.authenticateToken);

// Create a new historic notification
router.post("/", historicNotificationController.createNotification);

// Get historic notifications for the authenticated user
router.get("/", historicNotificationController.getNotifications);

// Get unread notification count
router.get("/unread/count", historicNotificationController.getUnreadCount);

// Mark a notification as read
router.put("/:notificationId/read", historicNotificationController.markAsRead);

// Mark all notifications as read
router.put("/read-all", historicNotificationController.markAllAsRead);

// Delete a notification
router.delete(
  "/:notificationId",
  historicNotificationController.deleteNotification
);

export default router;
