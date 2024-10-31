/**
 * Define Routes
 */

import type { Application } from "express";
import LocalConfig from "../configs/LocalConfig";
import Logger from "../logger";
import AuthRouter from "../modules/Register/Route";
import ShiftTypeRouter from "src/modules/shiftsType/Route";
import ShiftRouter from "src/modules/shift/Route";
import InvitationRouter from "src/modules/invitations/Route";
import EmailRouter from "src/modules/email/Route";
import TimesheetRouter from "src/modules/Timesheet/Route";
import TimelineRouter from "src/modules/Timeline/Route";
import CarerDocumentRouter from "src/modules/CarerDoc/Route";
import GroupRouter from "src/modules/Groups/Routes";
import ChatRouter from "src/modules/Chat/Route";
import PictureRouter from "src/modules/Picture/Route";
import LeaveRouter from "src/modules/Leave/Router";
import CarerApplicationRouter from "src/modules/auth/ApplicationRoute";
import ShiftPattern from "src/modules/ShiftPattern/Route";
import InvoiceRoute from "src/modules/InvoiceController/Routes";
import OrganisationRoute from "src/modules/Organisation/Route";
import JoinRequestsRoute from "src/modules/JoinRequests/Route";
import StaffRouter from "src/modules/Staff/Route";
import StripeRouter from "src/modules/Stripe/Route";
import VisibilityRouter from "src/modules/Application/Router";
import PermissionRoute from "src/modules/Permissions/Route";
import FCMRouter from "src/modules/Notifications/Route";
import NotificationRouter from "src/modules/Notifications/HistoricRoute";

class Routes {
  /**
   * @name mountApi
   * @description Mount all api routes
   * @param _express
   * @returns Application
   */
  public mountApi(_express: Application): Application {
    const apiPrefix = LocalConfig.getConfig().API_PREFIX;
    Logger.info("Routes :: Mounting API routes...");

    // Mounting Routes
    _express.use(`/${apiPrefix}/auth`, AuthRouter);
    _express.use(`/${apiPrefix}/shifttype`, ShiftTypeRouter);
    _express.use(`/${apiPrefix}/shift`, ShiftRouter);
    _express.use(`/${apiPrefix}/invitations`, InvitationRouter);
    _express.use(`/${apiPrefix}/email`, EmailRouter);
    _express.use(`/${apiPrefix}/timesheet`, TimesheetRouter);
    _express.use(`/${apiPrefix}/timeline`, TimelineRouter);
    _express.use(`/${apiPrefix}/carer-documents`, CarerDocumentRouter);
    _express.use(`/${apiPrefix}/groups`, GroupRouter);
    _express.use(`/${apiPrefix}/chat`, ChatRouter);
    _express.use(`/${apiPrefix}/pictures`, PictureRouter);
    _express.use(`/${apiPrefix}/leave`, LeaveRouter);
    _express.use(`/${apiPrefix}/application`, CarerApplicationRouter);
    _express.use(`/${apiPrefix}/shift-pattern`, ShiftPattern);
    _express.use(`/${apiPrefix}/invoices`, InvoiceRoute);
    _express.use(`/${apiPrefix}/organizations`, OrganisationRoute);
    _express.use(`/${apiPrefix}/join-requests`, JoinRequestsRoute);
    _express.use(`/${apiPrefix}/staffs`, StaffRouter);
    _express.use(`/${apiPrefix}/stripe`, StripeRouter);
    _express.use(`/${apiPrefix}/application-visibility`, VisibilityRouter);
    _express.use(`/${apiPrefix}/permissions`, PermissionRoute);
    _express.use(`/${apiPrefix}/fcm`, FCMRouter);
    _express.use(`/${apiPrefix}/notifications`, NotificationRouter);
    // _express.use(`/${apiPrefix}/job`, JobRouter);

    return _express;
  }
}

export default new Routes();
