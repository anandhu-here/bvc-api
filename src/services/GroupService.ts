// src/services/GroupService.ts

import { Types } from "mongoose";
import Group from "src/models/Group";

class GroupService {
  public async createGroup(groupData: any): Promise<any> {
    const group = new Group(groupData);
    await group.save();
    return group;
  }

  public async updateGroup(groupId: string, updateData: any): Promise<any> {
    const group = await Group.findByIdAndUpdate(groupId, updateData, {
      new: true,
    });
    if (!group) {
      throw new Error("Group not found");
    }
    return group;
  }

  public async deleteGroup(groupId: string): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // // Remove group association from residents
    // await Resident.updateMany({ groupId: groupId }, { $unset: { groupId: 1 } });

    await Group.findByIdAndDelete(groupId);
  }

  public async getGroup(groupId: string): Promise<any> {
    const group = await Group.findById(groupId).populate("residents");
    if (!group) {
      throw new Error("Group not found");
    }
    return group;
  }

  public async getGroups(homeId: string): Promise<any> {
    return await Group.find({ homeId }).populate("residents");
  }

  public async addResidentToGroup(
    groupId: string,
    residentId: string
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // const resident = await Resident.findById(residentId);
    // if (!resident) {
    //   throw new Error("Resident not found");
    // }

    // group.residents.push(new Types.ObjectId(residentId));
    // resident.groupId = new Types.ObjectId(groupId);

    await group.save();
    // await resident.save();
  }
}

export default GroupService;
