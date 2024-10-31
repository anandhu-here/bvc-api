// AuthMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Permission } from "src/configs/Permissions";
import { FCMToken } from "src/models/new/FCM";
import {
  OrganizationRole,
  User,
  type IOrganization,
  type IOrganizationRole,
  type IUser,
} from "src/models/new/Heirarchy";
import type { IJoinRequest } from "src/models/new/JoinRequest";
import AuthService from "src/services/new/AuthServices";
import JoinRequestServices from "src/services/new/JoinRequests";
import OrganizationServices from "src/services/OrgServices";

interface AuthRequest extends Request {
  user?: IUser;
  notificationEnabled?: boolean;
  organization?: IOrganization;
  pendingJoinRequest?: IJoinRequest;
  currentOrganization?: IOrganization;
  staffType?: string;
}

class AuthMiddleware {
  private authService: AuthService;
  private joinRequestService: JoinRequestServices;
  private orgSvc: OrganizationServices;

  constructor() {
    this.authService = new AuthService();
    this.joinRequestService = new JoinRequestServices();
    this.orgSvc = new OrganizationServices();
  }

  public authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access token is required" });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
      };
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const roles = await this.orgSvc.getUserHighestAndLowestRoles(
        user._id.toString()
      );

      const { highest, lowest } = roles;

      const orgRoles = await OrganizationRole.find({ user: user._id });
      const organisation =
        (await this.orgSvc.getOrganizationsByUser(user._id.toString())) || [];

      const joinRequests =
        await this.joinRequestService.getLatestJoinRequestForUser(
          user._id.toString()
        );

      req.pendingJoinRequest = joinRequests;
      req.user = user;
      req.currentOrganization = highest.organization as IOrganization;
      req.staffType = highest.staffType;
      next();
    } catch (error) {
      console.log(error, "error");
      return res.status(403).json({ message: "Invalid or expired token" });
    }
  };
  //   public authorizeCreateOrganization = async (
  //     req: AuthRequest,
  //     res: Response,
  //     next: NextFunction
  //   ) => {
  //     if (!req.user) {
  //       return res.status(401).json({ message: "User not authenticated" });
  //     }

  //     try {
  //       const organization = await this.authService.getOrganisationByOwner(
  //         req.user._id.toString()
  //       );
  //       if (
  //         organization &&
  //         organization.owner.toString() === req.user._id.toString()
  //       ) {
  //         return res
  //           .status(403)
  //           .json({ message: "User already  owns an organization" });
  //       } else if (req.user.role === "admin") {
  //         next();
  //       } else {
  //         return res
  //           .status(403)
  //           .json({ message: "User not authorized to create an organization" });
  //       }
  //     } catch (message: any) {
  //       return res
  //         .status(500)
  //         .json({ message: "Error verifying user organization" });
  //     }
  //   };

  public authorizeCreateOrganization = (requiredPermission: any) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      try {
        const organization = await this.orgSvc.getOrganisationByOwner(
          req.user._id.toString()
        );
        if (
          organization &&
          organization.admin.toString() === req.user._id.toString()
        ) {
          return res
            .status(403)
            .json({ message: "User already  owns an organization" });
        } else if (req.user.role === "admin") {
          next();
        } else {
          return res
            .status(403)
            .json({ message: "User not authorized to create an organization" });
        }
      } catch (message: any) {
        return res
          .status(500)
          .json({ message: "Error verifying user organization" });
      }
    };
  };
  public authorizePermission = (requiredPermission: any) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const roles = await this.orgSvc.getUserHighestAndLowestRoles(
        req.user._id.toString()
      );

      if (!roles) {
        return res.status(403).json({
          message: "User does not have the required permission for this action",
        });
      }
      try {
        const { highest, lowest } =
          await this.orgSvc.getUserHighestAndLowestRoles(
            req.user._id.toString()
          );

        if (!highest || !highest.permissions.includes(requiredPermission)) {
          return res.status(403).json({
            message:
              "User does not have the required permission for this action",
          });
        }
        req.currentOrganization = highest.organization as IOrganization;
        next();
      } catch (message: any) {
        return res
          .status(500)
          .json({ message: "Error verifying user permissions" });
      }
    };
  };

  public authorizeRoles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      if (!roles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ message: "User not authorized for this action" });
      }
      next();
    };
  };

  public authorizeOrganizationAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const organizationId = req.params.organizationId || req.body.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    try {
      const organizations = await this.orgSvc.getOrganizationsByUser(
        req.user._id.toString()
      );
      if (!organizations.some((org) => org._id.toString() === organizationId)) {
        return res
          .status(403)
          .json({ message: "User not authorized for this organization" });
      }
      next();
    } catch (message: any) {
      return res
        .status(500)
        .json({ message: "Error verifying organization access" });
    }
  };
}

export default new AuthMiddleware();
