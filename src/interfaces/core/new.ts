import type {
  IOrganization,
  IOrganizationRole,
  IParentCompany,
  IUser,
} from "src/models/new/Heirarchy";
import type { IJoinRequest } from "src/models/new/JoinRequest";
import type { IPaymentModel } from "../entities/payement";
import { UploadedFile } from "express-fileupload";
import type { Request, Response } from "express";

export interface IRequest extends Request {
  user?: IUser;
  notificationEnabled?: boolean;
  token?: string;
  organization?: IOrganization;
  organizationRoles?: IOrganizationRole[];
  parentCompany?: IParentCompany;
  organizationRole?: IOrganizationRole;
  pendingJoinRequest?: IJoinRequest;
  currentOrganization?: IOrganization;
  staffType?: string;
  invToken?: string;
  files?: {
    [key: string]: UploadedFile;
  };

  // Subscription and payment related properties
  activeSubscription?: {
    status: string;
    planName: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
  };
  subscriptionStatus?:
    | "active"
    | "inactive"
    | "trialing"
    | "past_due"
    | "canceled"
    | "unpaid";
  isInTrialPeriod?: boolean;
  trialEnd?: Date;
  organizationType?: "home" | "agency";

  // Feature access property
  hasAccessToFeature?: (featureId: string) => boolean;
}

export interface IResponse extends Response {
  status(code: number): this;
  json(body: any): this;
}
