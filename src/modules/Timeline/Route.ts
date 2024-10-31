import { Router } from "express";
import AuthMiddleware from "src/middlewares/Auth";
import TimelineController from "./TimelineController";

const _timelineCtrl = new TimelineController();

const TimelineRouter: Router = Router();

TimelineRouter.route("/current-company").get(
  AuthMiddleware.isAuthenticatedUser,
  _timelineCtrl.getCurrentCompany
);

TimelineRouter.route("/previous-companies").get(
  AuthMiddleware.isAuthenticatedUser,
  _timelineCtrl.getPreviousCompanies
);

TimelineRouter.route("/remove-current-company").delete(
  AuthMiddleware.isAuthenticatedUser,
  _timelineCtrl.removeCurrentCompany
);

export default TimelineRouter;
