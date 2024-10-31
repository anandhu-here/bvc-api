import {
  AgencyShiftType,
  HomeShiftType,
  ShiftPattern,
  type IAgencyShiftType,
  type IHomeShiftType,
  type IShiftType,
} from "src/models/ShiftPattern";
import Logger from "../logger";
import type {
  IShiftPattern,
  IShiftpatternTimings,
} from "src/interfaces/entities/shift-pattern";
import { Types } from "mongoose";
import { user } from "firebase-functions/v1/auth";

class ShiftTypeService {
  public createShiftPattern = async (
    shiftType: IShiftType,
    userId: Types.ObjectId | string
  ): Promise<IShiftType> => {
    try {
      const newShiftPattern = new ShiftPattern({ ...shiftType, userId });
      return await newShiftPattern.save();
    } catch (error: any) {
      console.log("error", error);
      Logger.error(
        "ShiftTypeService: createShiftPattern",
        JSON.stringify(error)
      );
      throw error;
    }
  };
  public checkShiftPattern = async (
    userId: string
  ): Promise<IShiftPattern[]> => {
    try {
      const userShift = await ShiftPattern.find({ userId });
      return userShift as IShiftPattern[];
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: checkShiftType",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  public getShiftPatternTimingByHome = async (
    homeId?: string,
    shiftpatId?: string
  ): Promise<IShiftpatternTimings> => {
    try {
      const shiftPat = await ShiftPattern.findById(shiftpatId).lean();
      console.log("shiftPat", shiftPat);
      const timing = shiftPat.timings.find(
        (timing) => timing?.careHomeId === homeId
      );

      return timing;
    } catch (error: any) {
      Logger.error("ShiftTypeService: getShiftPattern", JSON.stringify(error));
      throw error;
    }
  };

  public createHomeShiftType = async (
    userId: string,
    shiftType: IShiftType
  ): Promise<IHomeShiftType> => {
    try {
      let homeShiftType = await HomeShiftType.findOne({ userId });
      if (homeShiftType) {
        homeShiftType.shiftTypes.push(shiftType);
      } else {
        homeShiftType = new HomeShiftType({ userId, shiftTypes: [shiftType] });
      }
      return await homeShiftType.save();
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: createHomeShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public createAgencyShiftType = async (
    userId: string,
    shiftType: IShiftType
  ): Promise<IAgencyShiftType> => {
    try {
      let agencyShiftType = await AgencyShiftType.findOne({ userId });
      if (agencyShiftType) {
        agencyShiftType.shiftTypes.push(shiftType);
      } else {
        agencyShiftType = new AgencyShiftType({
          userId,
          shiftTypes: [shiftType],
        });
      }
      return await agencyShiftType.save();
    } catch (error: any) {
      console.log("error", error);
      Logger.error(
        "ShiftTypeService: createAgencyShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public getShiftPattern = async (
    userId: string
  ): Promise<IShiftType[] | null> => {
    try {
      return await ShiftPattern.find({ userId }).lean();
    } catch (error: any) {
      Logger.error("ShiftTypeService: getShiftPattern", JSON.stringify(error));
      throw error;
    }
  };

  public getHomeShiftTypes = async (
    userId: string
  ): Promise<IHomeShiftType | null> => {
    try {
      return await HomeShiftType.findOne({ userId });
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: getHomeShiftTypes",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public getAgencyShiftTypes = async (
    agencyId: string
  ): Promise<IAgencyShiftType | null> => {
    try {
      return await AgencyShiftType.findOne({ agencyId });
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: getAgencyShiftTypes",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public updateHomeShiftType = async (
    userId: string,
    shiftTypeId: string,
    updatedShiftType: IShiftType
  ): Promise<IHomeShiftType | null> => {
    try {
      return await HomeShiftType.findOneAndUpdate(
        { userId, "shiftTypes._id": shiftTypeId },
        { $set: { "shiftTypes.$": updatedShiftType } },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: updateHomeShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public updateYourShiftPattern = async (
    userId: string,
    shiftTypeId: string,
    updatedShiftType: IShiftType
  ): Promise<IShiftType | null> => {
    try {
      return await ShiftPattern.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), _id: shiftTypeId },
        { $set: updatedShiftType },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: updateYourShiftPattern",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public updateAgencyShiftType = async (
    userId: string,
    shiftTypeId: string,
    updatedShiftType: IShiftType
  ): Promise<IAgencyShiftType | null> => {
    try {
      return await AgencyShiftType.findOneAndUpdate(
        { userId, "shiftTypes._id": shiftTypeId },
        { $set: { "shiftTypes.$": updatedShiftType } },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: updateAgencyShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public deleteShiftPattern = async (
    userId: string,
    shiftTypeId: string
  ): Promise<IShiftType | null> => {
    try {
      return await ShiftPattern.findOneAndDelete({ userId, _id: shiftTypeId });
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: deleteShiftPattern",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public deleteHomeShiftType = async (
    userId: string,
    shiftTypeId: string
  ): Promise<IHomeShiftType | null> => {
    try {
      return await HomeShiftType.findOneAndUpdate(
        { userId },
        { $pull: { shiftTypes: { _id: shiftTypeId } } },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: deleteHomeShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };

  public deleteAgencyShiftType = async (
    userId: string,
    shiftTypeId: string
  ): Promise<IAgencyShiftType | null> => {
    try {
      return await AgencyShiftType.findOneAndUpdate(
        { userId },
        { $pull: { shiftTypes: { _id: shiftTypeId } } },
        { new: true }
      );
    } catch (error: any) {
      Logger.error(
        "ShiftTypeService: deleteAgencyShiftType",
        JSON.stringify(error)
      );
      throw error;
    }
  };
}

export default ShiftTypeService;
