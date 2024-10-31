import Stripe from "stripe";
import { IOrganization, Organization } from "../models/new/Heirarchy";
import { Types } from "mongoose";

class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2024-06-20",
    });
  }

  // Add this method to your StripeService class
  async getPlanDetails(subscriptionId: string): Promise<any> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        {
          expand: ["items.data.price.product"],
        }
      );

      let planDetails = {
        planName: "Unknown Plan",
        planDescription: "",
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };

      if (subscription.items.data.length > 0) {
        const item = subscription.items.data[0];
        const product = item.price.product as Stripe.Product;

        planDetails.planName = product.name;
        planDetails.planDescription = product.description || "";
      }

      return planDetails as any;
    } catch (error) {
      console.error("Error fetching plan details from Stripe:", error);
      throw error;
    }
  }

  async createSetupIntent(customerId: string): Promise<string> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    return setupIntent.client_secret as string;
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(organizationId: string): Promise<any> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (!organization.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      organization.stripeSubscriptionId
    );

    if (subscription.status === "canceled") {
      organization.subscriptionStatus = "canceled";
      organization.isInTrialPeriod = false;
      await organization.save();
      return { message: "Subscription already canceled" };
    }

    const canceledSubscription = await this.stripe.subscriptions.cancel(
      organization.stripeSubscriptionId
    );

    organization.subscriptionStatus = "canceled";
    organization.isInTrialPeriod = false;
    await organization.save();

    return canceledSubscription;
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );

      switch (event.type) {
        case "invoice.paid":
          await this.handleInvoicePaid(event.data.object);
          break;
        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object);
          break;
      }
    } catch (err) {
      console.error("Error processing webhook:", err);
      throw err;
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const organizationId = invoice.metadata.organizationId;
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (organization) {
        organization.subscriptionStatus = "active";
        await organization.save();
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const organizationId = invoice.metadata.organizationId;
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (organization) {
        organization.subscriptionStatus = "past_due";
        await organization.save();
      }
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId;
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (organization) {
        organization.subscriptionStatus = "canceled";
        organization.stripeSubscriptionId = null;
        organization.isInTrialPeriod = false;
        await organization.save();
      }
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId;
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (organization) {
        organization.subscriptionStatus = subscription.status as any;
        organization.subscriptionPlan =
          (subscription.items.data[0].price.nickname as any) || "basic";
        await organization.save();
      }
    }
  }

  async getPlansByOrganizationType(organizationType: string): Promise<any[]> {
    const productMapping: { [key: string]: { [key: string]: string } } = {
      agency: {
        basic: "prod_QycfmYhn9gaXQB",
        pro: "prod_QycfkyMrcAuUkg",
      },
      home: {
        basic: "prod_QycYTa7Mmj8AfL",
        pro: "prod_QycaS2i5lrcLGe",
      },
    };

    const orgProducts = productMapping[organizationType];

    if (!orgProducts) {
      throw new Error(
        `No products found for organization type: ${organizationType}`
      );
    }

    try {
      const plans = await Promise.all(
        Object.entries(orgProducts).map(async ([planTier, productId]) => {
          const product = await this.stripe.products.retrieve(productId);
          const prices = await this.stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
          });

          if (prices.data.length === 0) {
            throw new Error(`No active price found for product: ${productId}`);
          }

          const price = prices.data[0];

          return {
            name: product.name,
            description: product.description,
            price: price.unit_amount ? price.unit_amount / 100 : 0,
            interval: price.recurring?.interval || "one-time",
            stripeProductId: product.id,
            stripePriceId: price.id,
            organizationType,
            planTier,
          };
        })
      );

      return plans;
    } catch (error: any) {
      console.error("Error fetching plans from Stripe:", error);
      throw error;
    }
  }

  async getPlanByOrganizationType(
    organizationType: string,
    planTier: string
  ): Promise<any> {
    const productMapping: { [key: string]: { [key: string]: string } } = {
      agency: {
        basic: "prod_QycfmYhn9gaXQB",
        pro: "prod_QycfkyMrcAuUkg",
      },
      home: {
        basic: "prod_QycYTa7Mmj8AfL",
        pro: "prod_QycaS2i5lrcLGe",
      },
    };

    const productId = productMapping[organizationType]?.[planTier];

    if (!productId) {
      throw new Error(
        `No product found for organization type: ${organizationType} and plan tier: ${planTier}`
      );
    }

    try {
      const product = await this.stripe.products.retrieve(productId);
      const prices = await this.stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        throw new Error(`No active price found for product: ${productId}`);
      }

      const price = prices.data[0];

      return {
        name: product.name,
        description: product.description,
        price: price.unit_amount ? price.unit_amount / 100 : 0,
        interval: price.recurring?.interval || "one-time",
        stripeProductId: product.id,
        stripePriceId: price.id,
        organizationType,
        planTier,
      };
    } catch (error: any) {
      console.error("Error fetching plan from Stripe:", error);
      throw error;
    }
  }

  async getPaymentHistory(organizationId: string): Promise<any[]> {
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.stripeCustomerId) {
      throw new Error("Organization not found or not associated with Stripe");
    }

    const invoices = await this.stripe.invoices.list({
      customer: organization.stripeCustomerId,
      limit: 10,
    });

    return invoices?.data?.map((invoice) => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      amount: invoice.amount_paid / 100,
      status: invoice.status,
    }));
  }
  async changePlan(organizationId: string, newPlanId: string): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization || !organization.stripeSubscriptionId) {
        throw new Error("No active subscription found");
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        organization.stripeSubscriptionId
      );
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPlanId,
            },
          ],
          proration_behavior: "always_invoice",
        }
      );

      // Fetch product details for the new plan
      let planName = "basic";
      let planDescription = "";
      if (updatedSubscription.items.data.length > 0) {
        const item = updatedSubscription.items.data[0];
        const product = await this.stripe.products.retrieve(
          item.price.product as string
        );
        planName = product.name;
        planDescription = product.description || "";
      }

      // Update organization with new plan details
      organization.subscriptionPlan = planName as any;
      await organization.save();

      return {
        updatedSubscription,
        planName,
        planDescription,
      };
    } catch (error) {
      console.error("Error changing plan:", error);
      throw error;
    }
  }

  async getCardDetails(organizationId: string): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization || !organization.stripeCustomerId) {
        throw new Error("No customer found");
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: organization.stripeCustomerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        throw new Error("No payment method found");
      }

      const card = paymentMethods.data[0].card;
      return {
        last4: card?.last4,
        expMonth: card?.exp_month,
        expYear: card?.exp_year,
        brand: card?.brand,
      };
    } catch (error) {
      console.error("Error fetching card details:", error);
      throw error;
    }
  }

  async restartSubscription(
    organizationId: string,
    planId: string
  ): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      if (!organization.stripeCustomerId) {
        throw new Error("No Stripe customer ID found for this organization");
      }

      // Get the price for the selected plan
      const price = await this.stripe.prices.retrieve(planId);

      // Create a new subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: organization.stripeCustomerId,
        items: [{ price: price.id }],
        expand: ["latest_invoice.payment_intent"],
      });

      // Update organization with new subscription details
      organization.stripeSubscriptionId = subscription.id as string;
      organization.subscriptionStatus = subscription.status as any;
      organization.subscriptionPlan = (price.nickname as any) || "basic";
      await organization.save();

      let clientSecret: string | undefined;
      if (
        typeof subscription.latest_invoice === "object" &&
        subscription.latest_invoice.payment_intent
      ) {
        if (typeof subscription.latest_invoice.payment_intent === "object") {
          clientSecret =
            subscription.latest_invoice.payment_intent.client_secret;
        }
      }

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: clientSecret,
      };
    } catch (error: any) {
      console.error("Error restarting subscription:", error);
      throw error;
    }
  }
  async updatePaymentMethod(
    organizationId: string,
    paymentMethodId: string
  ): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      if (!organization.stripeCustomerId) {
        throw new Error("No Stripe customer ID found for this organization");
      }

      // Attach the new payment method to the customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: organization.stripeCustomerId,
      });

      // Set it as the default payment method
      await this.stripe.customers.update(organization.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // If there's an active subscription, update its default payment method
      if (organization.stripeSubscriptionId) {
        await this.stripe.subscriptions.update(
          organization.stripeSubscriptionId,
          {
            default_payment_method: paymentMethodId,
          }
        );
      }

      return { success: true, message: "Payment method updated successfully" };
    } catch (error: any) {
      console.error("Error updating payment method:", error);
      throw error;
    }
  }

  async createOrReactivateSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      const existingSubscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 1,
      });

      let subscription: Stripe.Subscription;

      if (existingSubscriptions.data.length > 0) {
        subscription = await this.stripe.subscriptions.update(
          existingSubscriptions.data[0].id,
          {
            cancel_at_period_end: false,
            items: [{ price: priceId }],
            default_payment_method: paymentMethodId,
          }
        );
      } else {
        subscription = await this.stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          default_payment_method: paymentMethodId,
        });
      }

      return subscription;
    } catch (error: any) {
      console.error("Error in createOrReactivateSubscription:", error);
      throw error;
    }
  }

  async createCustomer(
    organization: IOrganization,
    billingDetails: any
  ): Promise<string> {
    const customer = await this.stripe.customers.create({
      name: organization.name,
      email: organization.email,
      metadata: {
        organizationId: organization._id.toString(),
      },
      address: {
        line1: billingDetails.address.street,
        city: billingDetails.address.city,
        state: billingDetails.address.state,
        postal_code: billingDetails.address.zipCode,
        country: billingDetails.address.country,
      },
      phone: billingDetails.phone,
    });
    return customer.id;
  }

  async updateCustomer(
    customerId: string,
    billingDetails: any
  ): Promise<Stripe.Customer> {
    try {
      return this.stripe.customers.update(customerId, {
        address: {
          line1: billingDetails.address.street,
          city: billingDetails.address.city,
          state: billingDetails.address.state,
          postal_code: billingDetails.address.zipCode,
          country: billingDetails.address.country,
        },
        phone: billingDetails.phone,
      });
    } catch (error) {
      console.error("Error updating customer: pooor", error);
      throw error;
    }
  }

  async getSubscriptionDetails(organizationId: string): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      if (!organization.stripeSubscriptionId) {
        return {
          status: "inactive",
          message: "No active subscription found",
          organizationType: organization.type,
        };
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        organization.stripeSubscriptionId,
        {
          expand: ["latest_invoice", "customer", "default_payment_method"],
        }
      );

      let nextPaymentAttempt: Date | null = null;
      let amountDue = 0;

      if (
        typeof subscription.latest_invoice !== "string" &&
        subscription.latest_invoice
      ) {
        nextPaymentAttempt = subscription.latest_invoice.next_payment_attempt
          ? new Date(subscription.latest_invoice.next_payment_attempt * 1000)
          : null;
        amountDue = subscription.latest_invoice.amount_due / 100;
      }

      // Update organization status based on Stripe subscription status
      organization.subscriptionStatus = subscription.status as any;
      organization.isInTrialPeriod = subscription.status === "trialing";
      await organization.save();

      // Fetch product details
      let planName = "Default Plan";
      let planDescription = "";
      if (subscription.items.data.length > 0) {
        const item = subscription.items.data[0];
        const product = await this.stripe.products.retrieve(
          item.price.product as string
        );
        planName = product.name;
        planDescription = product.description || "";
      }

      return {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextPaymentDate: nextPaymentAttempt,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amountDue: amountDue,
        customerName: (subscription.customer as Stripe.Customer).name,
        planName: planName,
        planDescription: planDescription,
        defaultPaymentMethod: subscription.default_payment_method,
        organizationType: organization.type,
      };
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      throw error;
    }
  }

  async createCheckoutSession(
    priceId: string,
    customerEmail: string,
    clientReferenceId: string
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscribe/canceled`,
      customer_email: customerEmail,
      client_reference_id: clientReferenceId,
    });
  }

  async createSubscription(
    organizationId: string,
    organizationType: "home" | "agency",
    planTier: "basic" | "pro",
    paymentMethodId: string,
    billingDetails: any
  ): Promise<{ subscription: Stripe.Subscription; trialEnd: Date }> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      console.log(organization, "....");

      let customerId = organization.stripeCustomerId;

      if (!customerId) {
        const customer = await this.createCustomer(
          organization,
          billingDetails
        );
        customerId = customer;
        organization.stripeCustomerId = customerId;
        await organization.save();
      } else {
        await this.updateCustomer(customerId, billingDetails);
      }

      if (!paymentMethodId) {
        throw new Error("Payment method ID is required");
      }

      await this.updatePaymentMethod(organizationId, paymentMethodId);
      const priceId = this.getPriceId(organizationType, planTier);

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_end: Math.floor(trialEnd.getTime() / 1000),
        default_payment_method: paymentMethodId,
        expand: ["latest_invoice.payment_intent"],
        metadata: { organizationId: organizationId.toString() },
      });

      organization.stripeSubscriptionId = subscription.id;
      organization.subscriptionStatus = "trialing";
      organization.trialStart = new Date();
      organization.trialEnd = trialEnd;
      organization.isInTrialPeriod = true;
      organization.subscriptionPlan = planTier;
      await organization.save();

      return { subscription, trialEnd };
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  private getPriceId(
    organizationType: "home" | "agency",
    planTier: "basic" | "pro"
  ): string {
    const priceMap: { [key: string]: { [key: string]: string } } = {
      home: {
        basic: "price_1Q6fJd2M2oCccQjmRkZatDw1",
        pro: "price_1Q6fL22M2oCccQjmyAtyOIEh",
      },
      agency: {
        basic: "price_1Q6fPu2M2oCccQjmJ5gY9aCB",
        pro: "price_1Q6fQb2M2oCccQjmKuIu1Dz9",
      },
    };

    return priceMap[organizationType][planTier];
  }

  async retrieveCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  }

  async getTrialStatus(organizationId: string): Promise<any> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (organization.stripeSubscriptionId) {
      const subscription = await this.stripe.subscriptions.retrieve(
        organization.stripeSubscriptionId
      );
      organization.isInTrialPeriod = subscription.status === "trialing";
      await organization.save();
    }

    return {
      isInTrialPeriod: organization.isInTrialPeriod,
      trialStart: organization.trialStart,
      trialEnd: organization.trialEnd,
    };
  }

  async startTrial(
    organizationId: string,
    organizationType: "home" | "agency"
  ): Promise<any> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (organization.isInTrialPeriod) {
      throw new Error("Organization is already in trial period");
    }

    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 30);

    organization.isInTrialPeriod = true;
    organization.trialStart = trialStart;
    organization.trialEnd = trialEnd;
    organization.type = organizationType;

    await organization.save();

    return {
      message: "Trial period started successfully",
      trialStart,
      trialEnd,
      organizationType,
    };
  }

  async endTrial(organizationId: string): Promise<any> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (!organization.isInTrialPeriod) {
      throw new Error("Organization is not in trial period");
    }

    organization.isInTrialPeriod = false;
    organization.trialEnd = new Date();

    await organization.save();

    return {
      message: "Trial period ended successfully",
      trialEnd: organization.trialEnd,
    };
  }

  async checkFeatureAccess(
    organizationId: string,
    featureId: string
  ): Promise<boolean> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (organization.isInTrialPeriod) {
      return true;
    }

    if (!organization.stripeSubscriptionId) {
      return false;
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      organization.stripeSubscriptionId
    );

    const planId = subscription.items.data[0].price.id;
    const featureAccess = await this.getPlanFeatures(planId);

    return featureAccess.includes(featureId);
  }

  private async getPlanFeatures(planId: string): Promise<string[]> {
    const planFeatures: { [key: string]: string[] } = {
      price_1NvUOyAIzgLYCiNxBatMHpRs: ["feature1", "feature2"],
      price_1NvUPpAIzgLYCiNxLUhL8aFA: ["feature1", "feature2", "feature3"],
      price_1NvURGAIzgLYCiNxGqRaXhgr: ["feature1", "feature2"],
      price_1NvUSGAIzgLYCiNxUMzLxsU6: [
        "feature1",
        "feature2",
        "feature3",
        "feature4",
      ],
    };

    return planFeatures[planId] || [];
  }

  async updateSubscription(
    organizationId: string,
    newPlanTier: "basic" | "pro"
  ): Promise<Stripe.Subscription> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (!organization.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const newPriceId = this.getPriceId(organization.type, newPlanTier);

    const updatedSubscription = await this.stripe.subscriptions.update(
      organization.stripeSubscriptionId,
      {
        items: [
          {
            id: (
              await this.getSubscription(organization.stripeSubscriptionId)
            ).items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      }
    );

    organization.subscriptionPlan = newPlanTier;
    await organization.save();

    return updatedSubscription;
  }

  async listInvoices(organizationId: string): Promise<Stripe.Invoice[]> {
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.stripeCustomerId) {
      throw new Error("Organization not found or not associated with Stripe");
    }

    const invoices = await this.stripe.invoices.list({
      customer: organization.stripeCustomerId,
      limit: 10,
    });

    return invoices.data;
  }

  async createInvoice(organizationId: string): Promise<Stripe.Invoice> {
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.stripeCustomerId) {
      throw new Error("Organization not found or not associated with Stripe");
    }

    const invoice = await this.stripe.invoices.create({
      customer: organization.stripeCustomerId,
    });

    await this.stripe.invoices.finalizeInvoice(invoice.id);

    return invoice;
  }

  async refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }

  async updateBillingAddress(
    organizationId: string,
    billingDetails: any
  ): Promise<Stripe.Customer> {
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.stripeCustomerId) {
      throw new Error("Organization not found or not associated with Stripe");
    }

    return this.updateCustomer(organization.stripeCustomerId, billingDetails);
  }
}

export default StripeService;
