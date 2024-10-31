import { IRequest, IResponse, INext } from "../../interfaces/core/express";
import StatusCodes from "../../constants/statusCodes";
import StringValues from "../../constants/strings";
import Logger from "../../logger";
import UserService from "src/services/UserService";
import type PaymentService from "src/services/PaymentServices";

class PaymentController {
  private readonly _userSvc: UserService;
  private readonly _paymentSvc: PaymentService;

  constructor(userSvc: UserService, paymentSvc: PaymentService) {
    this._userSvc = userSvc;
    this._paymentSvc = paymentSvc;
  }

  public createSubscription = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { planId, paymentMethodId } = req.body;
      const userId = req.currentUser?._id;

      if (!userId || !planId || !paymentMethodId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
        return;
      }

      const subscription = await this._paymentSvc.createSubscription(
        userId.toString(),
        planId,
        paymentMethodId
      );

      res.status(StatusCodes.OK).json(subscription);
    } catch (error: any) {
      Logger.error("Error creating subscription:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };
  // In your PaymentController
  public initializeCustomer = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.currentUser?._id;

      if (!userId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
        return;
      }

      const customer = await this._paymentSvc.initializeCustomer(
        userId.toString()
      );

      res.status(StatusCodes.OK).json(customer);
    } catch (error: any) {
      Logger.error("Error initializing customer:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public cancelSubscription = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.currentUser?._id;

      if (!userId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
        return;
      }

      const result = await this._paymentSvc.cancelSubscription(
        userId.toString()
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      Logger.error("Error cancelling subscription:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public updatePaymentMethod = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.currentUser?._id;

      if (!userId || !paymentMethodId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
        return;
      }

      const result = await this._paymentSvc.updatePaymentMethod(
        userId.toString(),
        paymentMethodId
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
      Logger.error("Error updating payment method:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getPaymentHistory = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.currentUser?._id;

      if (!userId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
        return;
      }

      const paymentHistory = await this._paymentSvc.getPaymentHistory(
        userId.toString()
      );

      res.status(StatusCodes.OK).json(paymentHistory);
    } catch (error: any) {
      Logger.error("Error fetching payment history:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };

  public getSubscriptionStatus = async (
    req: IRequest,
    res: IResponse
  ): Promise<void> => {
    try {
      const userId = req.currentUser?._id;

      if (!userId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "User ID is required" });
        return;
      }

      const status = await this._paymentSvc.getSubscriptionStatus(
        userId.toString()
      );

      res.status(StatusCodes.OK).json(status);
    } catch (error: any) {
      Logger.error("Error fetching subscription status:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: StringValues.INTERNAL_SERVER_ERROR });
    }
  };
}

export default PaymentController;
