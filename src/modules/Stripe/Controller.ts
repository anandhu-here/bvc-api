import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import { Organization } from "src/models/new/Heirarchy";
import StripeService from "src/services/StripeService";

class StripeController {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  public createSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { organizationType, planTier, paymentMethodId, billingDetails } =
        req.body;
      const organizationId = req.currentOrganization._id; // Assuming you have middleware that sets this

      if (
        !organizationType ||
        !planTier ||
        !paymentMethodId ||
        !billingDetails
      ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Validate billing details
      if (!this.isValidBillingDetails(billingDetails)) {
        res.status(400).json({ error: "Invalid billing details" });
        return;
      }

      const result = await this.stripeService.createSubscription(
        organizationId.toString(),
        organizationType,
        planTier,
        paymentMethodId,
        billingDetails
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in createSubscription:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while creating the subscription",
      });
    }
  };

  private isValidBillingDetails(billingDetails: any): boolean {
    const requiredFields = ["address", "phone"];
    const requiredAddressFields = [
      "street",
      "city",
      "state",
      "zipCode",
      "country",
    ];

    if (
      !requiredFields.every((field) => billingDetails.hasOwnProperty(field))
    ) {
      return false;
    }

    if (
      !requiredAddressFields.every((field) =>
        billingDetails.address.hasOwnProperty(field)
      )
    ) {
      return false;
    }

    // Add any additional validation logic here
    // For example, you might want to check if the zip code or phone number format is valid

    return true;
  }

  public getPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationType = req.currentOrganization?.type;

      if (!organizationType) {
        res.status(400).json({ error: "Organization type is required" });
        return;
      }

      const plans = await this.stripeService.getPlansByOrganizationType(
        organizationType
      );
      res.status(200).json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching the plans",
      });
    }
  };

  public createSetupIntent = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;

      const organization = await Organization.findById(
        organizationId.toString()
      );
      if (!organization) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const clientSecret = await this.stripeService.createSetupIntent(
        organization.stripeCustomerId
      );
      res.status(200).json({ clientSecret });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while creating the setup intent",
      });
    }
  };

  public cancelSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    console.log("CANCELING");
    try {
      const organizationId = req.currentOrganization?._id;

      if (!organizationId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      const result = await this.stripeService.cancelSubscription(
        organizationId.toString()
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while canceling the subscription",
      });
    }
  };

  public restartSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { planId } = req.body;
      const organizationId = req.currentOrganization._id;
      const result = await this.stripeService.restartSubscription(
        organizationId.toString(),
        planId
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error restarting subscription:", error);
      res.status(500).json({ error: "Failed to restart subscription" });
    }
  };

  public changePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { newPlanId } = req.body;
      const organizationId = req.currentOrganization._id;
      const result = await this.stripeService.changePlan(
        organizationId.toString(),
        newPlanId
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error changing plan:", error);
      res.status(500).json({ error: "Failed to change plan" });
    }
  };

  public getCardDetails = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization._id;
      const cardDetails = await this.stripeService.getCardDetails(
        organizationId.toString()
      );
      res.status(200).json(cardDetails);
    } catch (error) {
      console.error("Error fetching card details:", error);
      res.status(500).json({ error: "Failed to fetch card details" });
    }
  };

  public updatePaymentMethod = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { paymentMethodId } = req.body;
      console.log("PAYMENT METHOD ID", paymentMethodId);
      const organizationId = req.currentOrganization._id;
      const result = await this.stripeService.updatePaymentMethod(
        organizationId.toString(),
        paymentMethodId
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ error: "Failed to update payment method" });
    }
  };

  public getSubscriptionDetails = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;
      if (!organizationId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      const subscriptionDetails =
        await this.stripeService.getSubscriptionDetails(
          organizationId.toString()
        );

      if (subscriptionDetails.status === "inactive") {
        res.status(200).json({
          status: "inactive",
          message: "No active subscription found",
          organizationType: subscriptionDetails.organizationType,
        });
      } else {
        res.status(200).json(subscriptionDetails);
      }
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      res.status(500).json({
        error:
          error.message ||
          "An error occurred while fetching subscription details",
      });
    }
  };

  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["stripe-signature"] as string;

    try {
      await this.stripeService.handleWebhook(req.body, signature);
      res.sendStatus(200);
    } catch (error: any) {
      console.error("Error handling webhook:", error);
      res.status(400).json({ error: error.message || "Invalid webhook" });
    }
  };

  public getPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationType, planTier } = req.params;

      if (!organizationType || !planTier) {
        res
          .status(400)
          .json({ error: "Organization type and plan tier are required" });
        return;
      }

      const plan = await this.stripeService.getPlanByOrganizationType(
        organizationType,
        planTier
      );
      res.status(200).json(plan);
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching the plan",
      });
    }
  };

  public getPaymentHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;
      if (!organizationId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      const paymentHistory = await this.stripeService.getPaymentHistory(
        organizationId.toString()
      );
      res.status(200).json(paymentHistory);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({
        error:
          error.message ||
          "An error occurred while fetching the payment history",
      });
    }
  };

  public createCheckoutSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { priceId, customerEmail, clientReferenceId } = req.body;

      const session = await this.stripeService.createCheckoutSession(
        priceId,
        customerEmail,
        clientReferenceId
      );
      res.status(200).json({ id: session.id });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error:
          error.message ||
          "An error occurred while creating the checkout session",
      });
    }
  };

  public verifyCheckoutSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { sessionId } = req.params;

      const session = await this.stripeService.retrieveCheckoutSession(
        sessionId
      );

      if (session.payment_status === "paid") {
        // Update the organization's subscription status
        const organizationId = session.client_reference_id;
        await Organization.findByIdAndUpdate(organizationId, {
          subscriptionStatus: "active",
          stripeSubscriptionId: session.subscription as string,
        });

        res.status(200).json({ success: true, message: "Payment verified" });
      } else {
        res
          .status(400)
          .json({ success: false, message: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Error verifying checkout session:", error);
      res.status(500).json({
        error:
          error.message ||
          "An error occurred while verifying the checkout session",
      });
    }
  };

  public getTrialStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;
      if (!organizationId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      const trialStatus = await this.stripeService.getTrialStatus(
        organizationId.toString()
      );
      res.status(200).json(trialStatus);
    } catch (error: any) {
      console.error("Error fetching trial status:", error);
      res.status(500).json({
        error: error.message || "An error occurred while fetching trial status",
      });
    }
  };

  public startTrial = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;
      const { organizationType } = req.body;
      if (!organizationId || !organizationType) {
        res
          .status(400)
          .json({ error: "Organization ID and type are required" });
        return;
      }

      const trialDetails = await this.stripeService.startTrial(
        organizationId.toString(),
        organizationType
      );
      res.status(200).json(trialDetails);
    } catch (error: any) {
      console.error("Error starting trial:", error);
      res.status(500).json({
        error: error.message || "An error occurred while starting the trial",
      });
    }
  };

  public endTrial = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.currentOrganization?._id;
      if (!organizationId) {
        res.status(400).json({ error: "Organization ID is required" });
        return;
      }

      const result = await this.stripeService.endTrial(
        organizationId.toString()
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error ending trial:", error);
      res.status(500).json({
        error: error.message || "An error occurred while ending the trial",
      });
    }
  };

  public checkFeatureAccess = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { featureId } = req.params;
      const organizationId = req.currentOrganization?._id;
      if (!organizationId || !featureId) {
        res
          .status(400)
          .json({ error: "Organization ID and feature ID are required" });
        return;
      }

      const hasAccess = await this.stripeService.checkFeatureAccess(
        organizationId.toString(),
        featureId
      );
      res.status(200).json({ hasAccess });
    } catch (error: any) {
      console.error("Error checking feature access:", error);
      res.status(500).json({
        error:
          error.message || "An error occurred while checking feature access",
      });
    }
  };
}

export default StripeController;
