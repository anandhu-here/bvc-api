import express from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import type { IRequest } from "src/interfaces/core/new";
import { Permission } from "src/configs/Permissions";
import PasswordController from "../auth/PasswordController";
import UserService from "src/services/UserService";
import FCMController from "./Conrtoller";

const router = express.Router();
const fcmController = new FCMController();

// Existing routes...

// FCM routes
router.use(AuthMiddleware.authenticateToken);

router.post("/register", fcmController.registerToken);

router.get("/tokens", fcmController.getTokens);

router.delete("/token", fcmController.deleteToken);

export default router;
