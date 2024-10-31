import { Types } from "mongoose";
import Logger from "../logger";
import User from "../models/User";
import { IUser, IUserModel } from "../interfaces/entities/user";
import UserRelationship from "src/models/UserRelationShip";

class ProfileService {
  public getProfileExc = async (currentUser: IUserModel): Promise<any> => {
    try {
      return Promise.resolve(currentUser);
    } catch (error: any) {
      Logger.error(
        "ProfileService: getProfileExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  public async updateFcmToken(
    userId: string,
    token: string
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const existingToken = user.fcmTokens.find((t) => t.token === token);
      if (existingToken) {
        existingToken.updatedAt = new Date();
      } else {
        user.fcmTokens.push({
          token,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await user.save();
      return user as any;
    } catch (error: any) {
      throw error;
    }
  }

  getStaffsForAssign = async (userId: string, date: string): Promise<any> => {
    try {
      const relationships = await UserRelationship.find({
        userId: new Types.ObjectId(userId),
        relationshipType: { $in: ["carer", "nurse"] },
      });

      const staffIds = relationships.map((rel) => rel.relatedUserId);

      const unavailableStaffs = await User.find({
        _id: { $in: staffIds },
        "availabilities.dates": { $nin: [date] },
      }).select("_id fname lname email accountType availabilities");

      return unavailableStaffs.map((staff) => ({
        ...staff.toObject(),
        accountType: relationships.find((rel) =>
          rel.relatedUserId.equals(staff._id.toString())
        )?.relationshipType,
      }));
    } catch (error: any) {
      console.error("Error in getStaffsForAssign:", error);
      throw error;
    }
  };

  public async getLinkedUsers(
    userId: string,
    accountType?: string,
    gettingFor?: string
  ): Promise<IUserModel[]> {
    try {
      let query: any = { userId: new Types.ObjectId(userId) };

      if (accountType === "staffs") {
        query.relationshipType = { $in: ["carer", "nurse"] };
      } else if (accountType === "all") {
        const user = await User.findById(userId);
        if (["agency", "home"].includes(user?.accountType)) {
          query.relationshipType = {
            $in: ["carer", "nurse", "agency", "home"],
          };
        }
      } else if (accountType) {
        query.relationshipType = accountType;
      }

      const relationships = await UserRelationship.find(query);
      const linkedUserIds = relationships.map((rel) => rel.relatedUserId);

      const linkedUsers = await User.find({ _id: { $in: linkedUserIds } })
        .select("-password")
        .lean();

      return linkedUsers.map((user) => ({
        ...user,
        accountType: relationships.find((rel) =>
          rel.relatedUserId.equals(user._id.toString())
        )?.relationshipType,
      })) as any;
    } catch (error: any) {
      console.error("Error getting linked users:", error);
      throw error;
    }
  }

  public async updateAvailabilities(
    userId: string,
    dates: string[]
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.availabilities) {
        user.availabilities = { dates: [] };
      }

      user.availabilities.dates = [
        ...new Set([...user.availabilities.dates, ...dates]),
      ];
      await user.save();

      return user as any;
    } catch (error: any) {
      throw error;
    }
  }

  public async deleteAvailability(
    userId: string,
    date: string
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.availabilities) {
        user.availabilities.dates = user.availabilities.dates.filter(
          (d) => d !== date
        );
        await user.save();
      }

      return user as any;
    } catch (error: any) {
      throw error;
    }
  }
}

export default ProfileService;
