import { Router } from "express";
import StripeController from "./Controller";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import PaymentMiddleware from "src/middlewares/Payment";

const stripeController = new StripeController();

const StripeRouter: Router = Router();

// Subscription management
StripeRouter.post(
  "/create-subscription",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkOrganizationType,
  stripeController.createSubscription
);
StripeRouter.post(
  "/cancel-subscription",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  PaymentMiddleware.requireActiveSubscription,
  stripeController.cancelSubscription
);

StripeRouter.post(
  "/restart-subscription",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.restartSubscription
);
StripeRouter.post(
  "/change-plan",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.changePlan
);

StripeRouter.get(
  "/card-details",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.getCardDetails
);

StripeRouter.post(
  "/update-payment-method",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.updatePaymentMethod
);

StripeRouter.get(
  "/subscription-details",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.getSubscriptionDetails
);

// Payment method management
StripeRouter.post(
  "/create-setup-intent",
  AuthMiddleware.authenticateToken,
  stripeController.createSetupIntent
);

// Plan and payment history
StripeRouter.get(
  "/plans/:organizationType/:planTier",
  AuthMiddleware.authenticateToken,
  stripeController.getPlan
);
StripeRouter.get(
  "/plans",
  AuthMiddleware.authenticateToken,
  stripeController.getPlans
);

StripeRouter.get(
  "/payment-history",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  stripeController.getPaymentHistory
);

// Checkout session
StripeRouter.post(
  "/create-checkout-session",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkOrganizationType,
  stripeController.createCheckoutSession
);
StripeRouter.get(
  "/verify-checkout-session/:sessionId",
  AuthMiddleware.authenticateToken,
  stripeController.verifyCheckoutSession
);

// Trial period management
StripeRouter.get(
  "/trial-status",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkTrialPeriod,
  stripeController.getTrialStatus
);
StripeRouter.post(
  "/start-trial",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkOrganizationType,
  stripeController.startTrial
);
StripeRouter.post(
  "/end-trial",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkTrialPeriod,
  stripeController.endTrial
);

// Webhook handling
StripeRouter.post("/webhook", stripeController.handleWebhook);

// Feature access check
StripeRouter.get(
  "/check-feature-access/:featureId",
  AuthMiddleware.authenticateToken,
  PaymentMiddleware.checkAndSetSubscriptionStatus,
  PaymentMiddleware.checkTrialPeriod,
  PaymentMiddleware.requireValidSubscriptionOrTrial,
  stripeController.checkFeatureAccess
);

export default StripeRouter;
