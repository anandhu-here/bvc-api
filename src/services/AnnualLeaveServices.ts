import { Types } from "mongoose";
import { IAnnualLeaveModel, IUserModel } from "src/interfaces/entities/user";
import AnnualLeave from "src/models/AnnualLeave";
import User from "src/models/User";

class AnnualLeaveServices {
  constructor() {
    console.log("AnnualLeave module");
  }
  public async configureAnnualLeave(
    userId: string,
    staffType: "carer" | "nurse" | "other",
    daysPerYear: number
  ): Promise<IUserModel> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const updateResult = await User.findOneAndUpdate(
      { _id: userId, "annualLeaveConfig.staffType": staffType },
      { $set: { "annualLeaveConfig.$.daysPerYear": daysPerYear } },
      { new: true, runValidators: true }
    );

    if (!updateResult) {
      // If the staffType doesn't exist in the array, add a new element
      await User.findByIdAndUpdate(
        userId,
        { $push: { annualLeaveConfig: { staffType, daysPerYear } } },
        { new: true, runValidators: true }
      );
    }

    // Fetch the updated user document
    const updatedUser = await User.findById(userId);
    if (!updatedUser) throw new Error("Failed to update user");

    return updatedUser as any;
  }

  public async getAnnualLeaveConfig(userId: string): Promise<any> {
    const staff = await User.findById(userId).exec();
    if (!staff) throw new Error("Staff not found");
    if (["home", "agency"].includes(staff.accountType)) {
      return staff.annualLeaveConfig;
    }
    // for (var users of staff.linkedUsers) {
    //   console.log(users.users[0].toString());
    //   if (["home", "agency"].includes(users.accountType)) {
    //     const admin = await User.findById(users.users[0].toString())
    //       .select("annualLeaveConfig")
    //       .lean();
    //     console.log(admin.annualLeaveConfig, "andi");
    //     return admin.annualLeaveConfig;
    //   } else return [];
    // }
    return staff.annualLeaveConfig;
  }

  public async requestAnnualLeave(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAnnualLeaveModel> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const leaveRequest = new AnnualLeave({
      userId: new Types.ObjectId(userId),
      startDate,
      endDate,
    });

    const savedLeaveRequest = await leaveRequest.save();
    return savedLeaveRequest;
  }

  public async approveAnnualLeave(
    leaveId: string,
    approverId: string
  ): Promise<IAnnualLeaveModel> {
    const leaveRequest = await AnnualLeave.findById(leaveId);
    if (!leaveRequest) throw new Error("Leave request not found");

    const user = await User.findById(leaveRequest.userId);
    if (!user) throw new Error("User not found");

    const days =
      Math.ceil(
        (leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) /
          (1000 * 3600 * 24)
      ) + 1;

    const total = await this.getTotalAnnualLeaveDays(user as any);

    if (user.usedLeaveDays + days > total) {
      throw new Error("Insufficient leave days");
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = new Types.ObjectId(approverId);
    const updatedLeaveRequest = await leaveRequest.save();

    user.usedLeaveDays += days;
    await user.save();

    return updatedLeaveRequest;
  }

  public async getAnnualLeaveRequests(
    userId: string,
    status?: string
  ): Promise<IAnnualLeaveModel[]> {
    const query: any = { userId };
    if (status) query.status = status;
    return AnnualLeave.find(query).sort({ createdAt: -1 });
  }

  private getTotalAnnualLeaveDays = async (
    user: IUserModel
  ): Promise<number> => {
    // const admin = user.linkedUsers
    //   .find((linkedUser) => {
    //     if (user.isHomeStaff) {
    //       return linkedUser.accountType === "home";
    //     } else if (user.isAgencyStaff) {
    //       return linkedUser.accountType === "agency";
    //     } else {
    //       return false;
    //     }
    //   })
    //   ?.users[0]?.toString();

    // if (admin) {
    //   const adminUser = await User.findById(admin).exec();
    //   if (!adminUser) throw new Error("Admin user not found");
    //   return adminUser.annualLeaveConfig.reduce(
    //     (total, config) => total + config.daysPerYear,
    //     0
    //   );
    // }

    return 0;
  };
}

export default AnnualLeaveServices;
