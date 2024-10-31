import StatusCodes from "../constants/statusCodes";
import Strings from "../constants/strings";
import ApiError from "../exceptions/ApiError";
import Logger from "../logger";
import type { IRequest, IResponse } from "src/interfaces/core/new";
import type { INext } from "src/interfaces/core/express";
import { Organization } from "src/models/new/Heirarchy";
import StripeService from "../services/StripeService";

class PaymentMiddleware {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  public checkAndSetSubscriptionStatus = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<void> => {
    try {
      if (!req.user || !req.currentOrganization?._id) {
        throw new ApiError(
          Strings.UNAUTHORIZED_ACCESS,
          StatusCodes.UNAUTHORIZED
        );
      }

      const organization = await Organization.findById(
        req.currentOrganization._id
      );

      if (!organization) {
        throw new ApiError("Organization not found", StatusCodes.NOT_FOUND);
      }

      const subscriptionDetails =
        await this.stripeService.getSubscriptionDetails(
          organization._id.toString()
        );

      req.subscriptionStatus = subscriptionDetails.status;
      req.activeSubscription = subscriptionDetails;

      next();
    } catch (error: any) {
      Logger.error("Error in checkAndSetSubscriptionStatus middleware:", error);
      next(
        error instanceof ApiError
          ? error
          : new ApiError(
              Strings.INTERNAL_SERVER_ERROR,
              StatusCodes.INTERNAL_SERVER_ERROR
            )
      );
    }
  };

  public requireActiveSubscription = (
    req: IRequest,
    res: IResponse,
    next: INext
  ): void => {
    if (
      req.subscriptionStatus !== "active" &&
      req.subscriptionStatus !== "trialing"
    ) {
      console.log("Active subscription required 1", req.subscriptionStatus);
      res.status(StatusCodes.PAYMENT_REQUIRED).json({
        message: Strings.ACTIVE_SUBSCRIPTION_REQUIRED,
        status: req.subscriptionStatus,
      });

      console.log("Active subscription required");
    } else {
      console.log("Active subscription found");
      next();
    }
  };

  public checkPlanAccess =
    (requiredPlan: string) =>
    async (req: IRequest, res: IResponse, next: INext): Promise<void> => {
      try {
        if (!req.activeSubscription) {
          res.status(StatusCodes.PAYMENT_REQUIRED).json({
            message: Strings.SUBSCRIPTION_NOT_FOUND,
            status: "no_subscription",
          });
          return;
        }

        if (req.activeSubscription.planName !== requiredPlan) {
          res.status(StatusCodes.FORBIDDEN).json({
            message: Strings.PLAN_UPGRADE_REQUIRED,
            status: "plan_mismatch",
            currentPlan: req.activeSubscription.planName,
            requiredPlan: requiredPlan,
          });
          return;
        }

        next();
      } catch (error: any) {
        Logger.error("Error in checkPlanAccess middleware:", error);
        next(
          new ApiError(
            Strings.INTERNAL_SERVER_ERROR,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }
    };

  public checkTrialPeriod = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<void> => {
    try {
      if (!req.user || !req.currentOrganization?._id) {
        throw new ApiError(
          Strings.UNAUTHORIZED_ACCESS,
          StatusCodes.UNAUTHORIZED
        );
      }

      const trialStatus = await this.stripeService.getTrialStatus(
        req.currentOrganization._id.toString()
      );

      req.isInTrialPeriod = trialStatus.isInTrialPeriod;
      req.trialEnd = trialStatus.trialEnd;

      next();
    } catch (error: any) {
      Logger.error("Error in checkTrialPeriod middleware:", error);
      next(
        error instanceof ApiError
          ? error
          : new ApiError(
              Strings.INTERNAL_SERVER_ERROR,
              StatusCodes.INTERNAL_SERVER_ERROR
            )
      );
    }
  };

  public checkOrganizationType = async (
    req: IRequest,
    res: IResponse,
    next: INext
  ): Promise<void> => {
    try {
      if (!req.user || !req.currentOrganization?._id) {
        throw new ApiError(
          Strings.UNAUTHORIZED_ACCESS,
          StatusCodes.UNAUTHORIZED
        );
      }

      const organization = await Organization.findById(
        req.currentOrganization._id
      );
      if (!organization) {
        throw new ApiError("Organization not found", StatusCodes.NOT_FOUND);
      }

      req.organizationType = organization.type;
      next();
    } catch (error: any) {
      Logger.error("Error in checkOrganizationType middleware:", error);
      next(
        error instanceof ApiError
          ? error
          : new ApiError(
              Strings.INTERNAL_SERVER_ERROR,
              StatusCodes.INTERNAL_SERVER_ERROR
            )
      );
    }
  };

  public requireValidSubscriptionOrTrial = (
    req: IRequest,
    res: IResponse,
    next: INext
  ): void => {
    if (
      req.subscriptionStatus === "active" ||
      req.subscriptionStatus === "trialing" ||
      req.isInTrialPeriod
    ) {
      next();
    } else {
      res.status(StatusCodes.PAYMENT_REQUIRED).json({
        message: "Active subscription or trial period required",
        status: req.subscriptionStatus,
        isInTrialPeriod: req.isInTrialPeriod,
      });
    }
  };

  public checkFeatureAccess =
    (featureId: string) =>
    async (req: IRequest, res: IResponse, next: INext): Promise<void> => {
      try {
        if (!req.user || !req.currentOrganization?._id) {
          throw new ApiError(
            Strings.UNAUTHORIZED_ACCESS,
            StatusCodes.UNAUTHORIZED
          );
        }

        const hasAccess = await this.stripeService.checkFeatureAccess(
          req.currentOrganization._id.toString(),
          featureId
        );

        if (!hasAccess) {
          res.status(StatusCodes.FORBIDDEN).json({
            message: "Feature access denied",
            featureId: featureId,
          });
          return;
        }

        next();
      } catch (error: any) {
        Logger.error("Error in checkFeatureAccess middleware:", error);
        next(
          error instanceof ApiError
            ? error
            : new ApiError(
                Strings.INTERNAL_SERVER_ERROR,
                StatusCodes.INTERNAL_SERVER_ERROR
              )
        );
      }
    };
}

export default new PaymentMiddleware();
