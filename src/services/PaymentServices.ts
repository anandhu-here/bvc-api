import { IUser, IUserModel } from "src/interfaces/entities/user";
import Logger from "../logger";
import User from "src/models/User";
import Payment from "src/models/Payments";
import stripe from "stripeConfig";
import type { IPaymentModel } from "src/interfaces/entities/payement";
import { Types } from "mongoose";

class PaymentService {
  public async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string
  ): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.stripeCustomerId)
        throw new Error("User not found or no Stripe customer ID");

      // Fetch the plan details from Stripe
      const price = await stripe.prices.retrieve(planId);
      const product = await stripe.products.retrieve(price.product as string);

      // Retrieve the payment method
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Set the payment method as the default for the customer
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: planId }],
        default_payment_method: paymentMethodId,
        expand: ["latest_invoice.payment_intent"],
      });

      const payment = await Payment.create({
        user: user._id,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: subscription.id,
        planId: planId,
        planName: product.name,
        amount: price.unit_amount! / 100, // Stripe stores amounts in cents
        currency: price.currency,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        failedPayments: 0,
        paymentMethod:
          paymentMethod.type === "card"
            ? paymentMethod.card?.brand === "visa"
              ? "credit_card"
              : "debit_card"
            : "paypal",
        paymentMethodDetails: {
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
        },
        invoices: [], // This will be populated later when invoices are generated
      });

      return { subscription, payment };
    } catch (error: any) {
      Logger.error("Error creating subscription:", error);
      throw error;
    }
  }

  public async initializeCustomer(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      if (user.stripeCustomerId) {
        return { customerId: user.stripeCustomerId };
      }

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });

      user.stripeCustomerId = customer.id;
      await user.save();

      return { customerId: customer.id };
    } catch (error: any) {
      Logger.error("Error initializing customer:", error);
      throw error;
    }
  }

  public async updatePaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId).populate("activeSubscription");
      if (!user) throw new Error("User not found");

      if (!user.stripeCustomerId)
        throw new Error("User does not have a Stripe customer ID");

      // Attach the new payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Set it as the default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const tempActiveSubscription = user.activeSubscription as any;

      // If there's an active subscription, update its default payment method
      if (user.activeSubscription) {
        let subscriptionId: string;

        if (
          typeof user.activeSubscription === "string" ||
          user.activeSubscription instanceof Types.ObjectId
        ) {
          const paymentDoc = await Payment.findById(user.activeSubscription);
          if (!paymentDoc) throw new Error("Payment document not found");
          subscriptionId = paymentDoc.subscriptionId;
        } else {
          subscriptionId = tempActiveSubscription.subscriptionId;
        }

        await stripe.subscriptions.update(subscriptionId, {
          default_payment_method: paymentMethodId,
        });

        // Update local payment record
        await Payment.findByIdAndUpdate(user.activeSubscription, {
          "paymentMethodDetails.id": paymentMethodId,
          // You might want to fetch and update other payment method details here
        });
      }

      return { success: true, message: "Payment method updated successfully" };
    } catch (error: any) {
      Logger.error("Error updating payment method:", error);
      throw error;
    }
  }

  public async cancelSubscription(
    userId: string
  ): Promise<IPaymentModel | null> {
    try {
      const user = await User.findById(userId).populate("activeSubscription");
      if (!user || !user.activeSubscription)
        throw new Error("No active subscription found");

      const subscriptionId = (user.activeSubscription as any).subscriptionId;

      // Use the cancel method instead of del
      const cancelledSubscription = await stripe.subscriptions.cancel(
        subscriptionId
      );

      const temp = user.activeSubscription as any;

      const payment = await Payment.findByIdAndUpdate(
        temp._id as any,
        {
          status: cancelledSubscription.status,
          canceledAt: new Date(cancelledSubscription.canceled_at * 1000),
        },
        { new: true }
      );

      user.activeSubscription = null;
      await user.save();

      return payment;
    } catch (error: any) {
      Logger.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  public async getPaymentHistory(userId: string): Promise<any> {
    try {
      const payments = await Payment.find({ user: userId }).sort({
        createdAt: -1,
      });
      return payments;
    } catch (error: any) {
      Logger.error("Error fetching payment history:", error);
      throw error;
    }
  }

  public async getSubscriptionStatus(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // Find the most recent active payment for this user
      const payment = await Payment.findOne({
        user: userId,
        status: { $in: ["active", "past_due", "unpaid", "incomplete"] },
      }).sort({ createdAt: -1 });

      if (!payment || !payment.subscriptionId) {
        return { status: "inactive" };
      }

      // Fetch the latest status from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        payment.subscriptionId
      );

      // Update the status in your database if it's different
      if (payment.status !== stripeSubscription.status) {
        payment.status = stripeSubscription.status as any;
        await payment.save();
      }

      return {
        status: stripeSubscription.status,
        planName: payment.planName,
        amount: payment.amount,
        currency: payment.currency,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ),
      };
    } catch (error: any) {
      Logger.error("Error fetching subscription status:", error);
      throw error;
    }
  }
}

export default PaymentService;
