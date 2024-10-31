import { Router } from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import FieldVisibilityController from "./ApplicationVisibility";
import FieldVisibilityService from "src/services/ApplicationVisibility";

const FieldVisibilityRouter: Router = Router();
const FieldVisibilitySvc = new FieldVisibilityService();
const FieldVisibilityCtrl = new FieldVisibilityController(FieldVisibilitySvc);

// Authentication middleware
FieldVisibilityRouter.use(AuthMiddleware.authenticateToken);

// Routes
FieldVisibilityRouter.get("/", FieldVisibilityCtrl.getFieldVisibility);
FieldVisibilityRouter.put("/", FieldVisibilityCtrl.updateFieldVisibility);

// New route to initialize field visibility for the organization
FieldVisibilityRouter.post(
  "/initialize",
  FieldVisibilityCtrl.initializeFieldVisibility
);

export default FieldVisibilityRouter;
