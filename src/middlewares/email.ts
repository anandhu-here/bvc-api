import { NextFunction } from "express";
import { IRequest, IResponse } from "src/interfaces/core/express";
import emailValidator from "src/validators/email";

class EmailMiddleware {
  public static async validateSendEmail(
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): Promise<any> {
    try {
      const { error } = emailValidator.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      next();
    } catch (error: any) {
      next(error);
    }
  }
}

export default EmailMiddleware;
