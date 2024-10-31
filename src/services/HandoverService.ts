// src/services/HandoverService.ts

import { Organization, User } from "src/models/new/Heirarchy";
import Handover, { IHandover } from "../models/Handover";

class HandoverService {
  async createOrUpdateHandover(
    userId: string,
    notes: string
  ): Promise<IHandover> {
    const user = await Organization.findById(userId);
    if (!user || user.type !== "home") {
      throw new Error("Invalid user or user is not a home account");
    }

    const handover = await Handover.findOneAndUpdate(
      { userId },
      {
        notes,
        initiatedAt: new Date(),
      },
      { new: true, upsert: true }
    );
    return handover;
  }

  async getHandoverByUserId(userId: string): Promise<IHandover | null> {
    return Handover.findOne({ userId });
  }

  async deleteHandover(userId: string): Promise<boolean> {
    const result = await Handover.deleteOne({ userId });
    return result.deletedCount > 0;
  }
}

export default HandoverService;
