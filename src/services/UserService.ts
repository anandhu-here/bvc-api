/**
 * Define User Service Class
 */

import { Types, type ObjectId, type UpdateQuery } from "mongoose";
import type { IUser, IUserModel } from "../interfaces/entities/user";
import Logger from "../logger";
import User from "../models/User";
import TimesheetModel from "src/models/Timesheet";
import TimelineModel from "src/models/Timeline";
import crypto from "crypto";
import UserRelationship from "src/models/UserRelationShip";

class UserService {
  public findByIdAndUpdate = async (
    userId: string,
    updateData: Partial<IUserModel>
  ): Promise<IUserModel | null> => {
    try {
      const user = await User.findById(userId).lean();

      if (!user) {
        return null;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).lean();

      return updatedUser as any;
    } catch (error: any) {
      Logger.error(
        "UserService: findByIdAndUpdate",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };
  public verifyEmail = async (token: string): Promise<IUserModel | null> => {
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
      }).lean();

      if (!user) {
        return null;
      }
      return Promise.resolve(user) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: verifyEmail",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  public emailVerified = async (userId: string): Promise<IUserModel | null> => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isEmailVerified: true,
          emailVerificationToken: "",
        },
        { new: true }
      ).lean();

      if (!user) {
        return null;
      }
      return Promise.resolve(user) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: emailVerified",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Create an `User`
  public createUserExc = async (_user: Partial<IUser>): Promise<IUserModel> => {
    try {
      const user = await User.create(_user);

      return Promise.resolve(user) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: createUserExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  /**
   * Search users by account type and company name
   * @param accountType The account type to filter by (optional)
   * @param companyName The company name to search for (optional)
   * @returns Promise<IUserModel[]>
   */
  public searchUsersExc = async (
    accountType?: string,
    companyName?: string
  ): Promise<IUserModel[]> => {
    try {
      let query: any = {};

      if (accountType) {
        query.accountType = accountType;
      }

      if (companyName) {
        const searchRegex = new RegExp(companyName.replace(/\s+/g, "|"), "i");
        query.$or = [
          { "company.name": { $regex: searchRegex } },
          { fname: { $regex: searchRegex } },
          { lname: { $regex: searchRegex } },
        ];
      }

      const users = await User.find(query).select(
        "_id fname lname email company.name company.address"
      );

      return Promise.resolve(users) as any;
    } catch (error: any) {
      Logger.error(
        "UserSearchService: searchUsersExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Find an `User` by Id
  public findUserByIdExc = async (
    _userId: string | ObjectId
  ): Promise<IUserModel> => {
    try {
      const user = await User.findById(_userId);

      return Promise.resolve(user) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: findUserByIdExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Find an `User` by an email
  public findUserByEmailExc = async (_email: string): Promise<IUserModel> => {
    try {
      const user = await User.findOne({ email: _email }).populate("company");

      return Promise.resolve(user) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: findUserByEmailExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  public getUsers = async (userType: string): Promise<IUserModel[]> => {
    try {
      const users = await User.find({
        accountType: userType,
      }).select("_id fname lname company.name company.address");

      return Promise.resolve(users) as any;
    } catch (error: any) {
      Logger.error(
        "UserService: getUsers",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Check if `User` already registered with the email
  public checkIsEmailExistsExc = async (_email: string): Promise<boolean> => {
    try {
      const user = await User.findOne({ email: _email });

      if (!user) {
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    } catch (error: any) {
      Logger.error(
        "UserService: checkIsEmailExistsExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Check if `User` already registered with the username
  public checkIsUsernameExistsExc = async (
    _username: string
  ): Promise<boolean> => {
    try {
      const user = await User.findOne({ username: _username });

      if (!user) {
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    } catch (error: any) {
      Logger.error(
        "UserService: checkIsUsernameExistsExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // Check if `User` already registered with the phone number
  public checkIsPhoneExistsExc = async (_phone: string): Promise<boolean> => {
    try {
      const user = await User.findOne({ phone: _phone });

      if (!user) {
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    } catch (error: any) {
      Logger.error(
        "UserService: checkIsEmailExistsExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };
  public async updateUser(
    userId: string,
    updateData: UpdateQuery<IUser>
  ): Promise<IUser | null> {
    try {
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).exec();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      return updatedUser as any;
    } catch (error: any) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  public async removeLinkedUser(
    userId: string,
    linkedUserType: string,
    linkedUserId: string
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      const linkedUser = await User.findById(linkedUserId);

      if (!user || !linkedUser) {
        throw new Error("User not found");
      }

      // Remove the relationship from UserRelationship collection
      await UserRelationship.deleteMany({
        $or: [
          { userId: userId, relatedUserId: linkedUserId },
          { userId: linkedUserId, relatedUserId: userId },
        ],
      });

      // Update isHomeStaff or isAgencyStaff status if necessary
      if (linkedUserType === "home") {
        const remainingHomeRelations = await UserRelationship.countDocuments({
          userId: userId,
          relationshipType: "home",
        });
        if (remainingHomeRelations === 0) {
          user.isHomeStaff = false;
          await user.save();
        }
      } else if (linkedUserType === "agency") {
        const remainingAgencyRelations = await UserRelationship.countDocuments({
          userId: userId,
          relationshipType: "agency",
        });
        if (remainingAgencyRelations === 0) {
          user.isAgencyStaff = false;
          await user.save();
        }
      }

      // Check and update the linked user's status
      if (
        linkedUser.accountType === "home" ||
        linkedUser.accountType === "agency"
      ) {
        const remainingRelations = await UserRelationship.countDocuments({
          userId: linkedUserId,
          relationshipType: { $in: ["carer", "nurse"] },
        });
        if (remainingRelations === 0) {
          linkedUser.isHomeStaff = false;
          linkedUser.isAgencyStaff = false;
          await linkedUser.save();
        }
      }

      Logger.info(`Relationship removed between ${userId} and ${linkedUserId}`);

      return user as any;
    } catch (error: any) {
      Logger.error("Error removing linked user:", error);
      throw error;
    }
  }

  public async getCarerResume(carerId: string) {
    const objectId = new Types.ObjectId(carerId);

    const [user, timesheets, timeline] = await Promise.all([
      User.findById(carerId).lean(),
      TimesheetModel.find({ carerId: objectId }).lean(),
      TimelineModel.findOne({ carerId: objectId })
        .populate("currentCompany")
        .populate("timeline.companyId")
        .lean(),
    ]);

    if (!user) {
      throw new Error("Carer not found");
    }

    const currentPosition = this.getCurrentPosition(timeline);
    const previousPositions = this.getPreviousPositions(timeline);

    return {
      user: {
        _id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        avatar: user.avatar,
      },
      currentPosition,
      previousPositions,
    };
  }

  private calculateAggregatedRating(timesheets: any[]): number {
    const ratings = timesheets
      .filter((t) => t.rating !== null)
      .map((t) => t.rating);
    if (ratings.length === 0) return 0;

    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const normalizedRating = (averageRating - 1) / 4; // Normalize to 0-1 range
    const confidenceFactor = 1 - Math.exp(-ratings.length / 10); // Confidence increases with more ratings
    return (
      1 +
      4 *
        (normalizedRating * confidenceFactor +
          averageRating * (1 - confidenceFactor))
    );
  }

  private getCurrentPosition(timeline: any): any {
    if (!timeline || !timeline.currentCompany) return null;

    const currentItem = timeline.timeline.find((item) => !item.dateEnded);
    if (!currentItem) return null;

    console.log("Andi");

    return {
      designation: timeline.currentDesignation,
      company: timeline.currentCompany.company?.name,
      companyLogo: timeline.currentCompany.company?.logo,
      startDate: currentItem.dateStarted,
      finalReview: "No final review provided yet",
      rating: 0,
    };
  }

  private getPreviousPositions(timeline: any): any[] {
    if (!timeline) return [];

    return timeline.timeline
      .filter((item) => item.dateEnded)
      .sort(
        (a, b) =>
          new Date(b.dateEnded).getTime() - new Date(a.dateEnded).getTime()
      )
      .map((item) => {
        return {
          designation: item.designation,
          company: item.companyId?.company?.name,
          companyLogo: item.companyId?.company?.logo,
          startDate: item.dateStarted,
          endDate: item.dateEnded,
          rating: item.finalRating,
          finalReview: item.finalReview || "No final review provided",
        };
      });
  }

  public generatePasswordResetToken = async (
    email: string
  ): Promise<string | null> => {
    try {
      const user = await User.findOne({ email });
      if (!user) return null;

      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

      await user.save();
      return resetToken;
    } catch (error: any) {
      Logger.error(
        "UserService: generatePasswordResetToken",
        "errorInfo:" + JSON.stringify(error)
      );
      return null;
    }
  };

  public findUserByResetToken = async (
    token: string
  ): Promise<IUserModel | null> => {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  };

  public resetPassword = async (
    userId: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      await user.setPassword(newPassword);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return true;
    } catch (error: any) {
      Logger.error(
        "UserService: resetPassword",
        "errorInfo:" + JSON.stringify(error)
      );
      return false;
    }
  };
}

export default UserService;
