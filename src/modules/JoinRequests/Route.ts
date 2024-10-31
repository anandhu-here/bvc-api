import express from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import type { IRequest } from "src/interfaces/core/new";
import { Permission } from "src/configs/Permissions";
import JoinRequestController from "./Controller";

const router = express.Router();
const joinRequestController = new JoinRequestController();

// Protected routes
router.use(AuthMiddleware.authenticateToken);

// Join Request routes
router.post("/", joinRequestController.createJoinRequest);
router.get("/", joinRequestController.getJoinRequests);
export default router;
