import {
  IRequest as Request,
  IResponse as Response,
} from "src/interfaces/core/new";
import PermissionService from "src/services/PermissionService";
import PermissionRoleService from "src/services/PermissionService";

class PermissionRoleController {
  async getAllPermissions(req: Request, res: Response) {
    try {
      const permissions = await PermissionService.getAllPermissions();
      return res.status(200).json({ permissions });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async addPermissionsToUser(req: Request, res: Response) {
    try {
      const { userId, permissions } = req.body;

      console.log(req.body, "dbody");
      const organizationId = req.currentOrganization._id;
      await PermissionRoleService.addPermissionsToUser(
        userId,
        organizationId.toString(),
        permissions
      );
      return res
        .status(200)
        .json({ message: "Permissions added successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async addRoleToUser(req: Request, res: Response) {
    try {
      const { userId, permission } = req.body;
      const organizationId = req.currentOrganization._id;
      await PermissionRoleService.addRoleToUser(
        userId,
        organizationId.toString(),
        permission
      );
      return res.status(200).json({ message: "Permission added successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async removeRoleFromUser(req: Request, res: Response) {
    try {
      const { userId, permission } = req.body;
      const organizationId = req.currentOrganization._id;
      await PermissionRoleService.removeRoleFromUser(
        userId,
        organizationId.toString(),
        permission
      );
      return res
        .status(200)
        .json({ message: "Permission removed successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default PermissionRoleController;
