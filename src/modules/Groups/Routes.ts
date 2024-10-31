// src/routes/groupRoutes.ts

import { Router } from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import GroupController from "src/modules/Groups/GroupController";

const router = Router();
const groupController = new GroupController();

router.use(AuthMiddleware.authenticateToken);

router.post("/", groupController.createGroup);

router.put("/:groupId", groupController.updateGroup);

router.delete("/:groupId", groupController.deleteGroup);

router.get("/:groupId", groupController.getGroup);

router.get("/:homeId/all", groupController.getGroups);

export default router;
