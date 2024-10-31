import type {
  IUserShiftType,
  IUserShiftTypeModel,
} from "src/interfaces/entities/shift-types";
import Logger from "../logger";
import UserShiftType from "src/models/ShiftType";
import { ShiftPattern } from "src/models/ShiftPattern";
import type { IShiftPattern } from "src/interfaces/entities/shift-pattern";

class UserShiftTypeService {
  // Create user shifts
  public createExc = async (
    newUserShift: IUserShiftType
  ): Promise<IUserShiftTypeModel> => {
    try {
      

      // Check if a shift type already exists with the user ID
      const existingUserShift = await UserShiftType.findOne({
        userId: newUserShift.userId,
      });

      if (existingUserShift) {
        // If a shift type exists, append the incoming array to the existing array
        existingUserShift.shifttypes = [
          ...existingUserShift.shifttypes,
          ...newUserShift.shifttypes,
        ];
        const updatedUserShift = await existingUserShift.save();
        return Promise.resolve(updatedUserShift);
      } else {
        // If no shift type exists, create a new entry
        const userShift = await UserShiftType.create({
          userId: newUserShift.userId,
          shifttypes: newUserShift.shifttypes,
        });
        return Promise.resolve(userShift);
      }
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: createExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  // public checkShiftType = async (userId: string): Promise<IShiftPattern[]> => {
  //   try {
  //     const userShift = await ShiftPattern.find({ userId });
  //     return userShift;
  //   } catch (error: any) {
  //     Logger.error(
  //       "UserShiftTypeService: checkShiftType",
  //       "errorInfo:" + JSON.stringify(error)
  //     );
  //     return Promise.reject(error);
  //   }
  // };

  // Find user shifts by user ID
  public findByUserIdExc = async (
    userId: string
  ): Promise<IUserShiftTypeModel | null> => {
    try {
      console.log(userId, "pari");
      const userShift = await UserShiftType.findOne({ userId });
      return Promise.resolve(userShift);
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: findByUserIdExc",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };

  //   delete
  public deleteShiftType = async (
    userId: string,
    shiftTypeId: string
  ): Promise<IUserShiftTypeModel | null> => {
    try {
      const userShift = await UserShiftType.findOneAndUpdate(
        { userId },
        { $pull: { shifttypes: { _id: shiftTypeId } } },
        { new: true }
      );
      return userShift;
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: deleteShiftType",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };
  //   delete entire shift type
  public deleteUserShift = async (
    userId: string
  ): Promise<IUserShiftTypeModel | null> => {
    try {
      const deletedUserShift = await UserShiftType.findOneAndDelete({ userId });
      return deletedUserShift;
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: deleteUserShift",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };
  public editShiftType = async (
    userId: string,
    shiftTypeId: string,
    updatedShiftType: IUserShiftType
  ): Promise<IUserShiftTypeModel | null> => {
    try {
      const userShift = await UserShiftType.findOneAndUpdate(
        { userId, "shifttypes._id": shiftTypeId },
        { $set: { "shifttypes.$": updatedShiftType } },
        { new: true }
      );
      return userShift;
    } catch (error: any) {
      Logger.error(
        "UserShiftTypeService: editShiftType",
        "errorInfo:" + JSON.stringify(error)
      );
      return Promise.reject(error);
    }
  };
}

export default UserShiftTypeService;
