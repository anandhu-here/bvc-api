// src/controllers/GroupController.ts

import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/express";
import GroupService from "src/services/GroupService";

class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  public createGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const groupData = req.body;
      const newGroup = await this.groupService.createGroup(groupData);
      res.status(201).json({ success: true, data: newGroup });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  public updateGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;
      const updateData = req.body;
      const updatedGroup = await this.groupService.updateGroup(
        groupId,
        updateData
      );
      res.status(200).json({ success: true, data: updatedGroup });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  public deleteGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;
      await this.groupService.deleteGroup(groupId);
      res
        .status(200)
        .json({ success: true, message: "Group deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  public getGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;
      const group = await this.groupService.getGroup(groupId);
      res.status(200).json({ success: true, data: group });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  };

  public getGroups = async (req: Request, res: Response): Promise<void> => {
    try {
      const { homeId } = req.params;
      const groups = await this.groupService.getGroups(homeId);
      res.status(200).json({ success: true, data: groups });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}

export default GroupController;
