import { Permission } from "src/configs/Permissions";
import OrganizationServices from "./OrgServices";
import { OrganizationRole, User } from "src/models/new/Heirarchy";

class PermissionRoleService {
  private orgRoleSvc: OrganizationServices;
  constructor() {
    this.orgRoleSvc = new OrganizationServices();
  }

  mapPermissionsToKeywords(): {
    permission: Permission;
    keyword: string;
  }[] {
    return Object.values(Permission).map((permission) => {
      const words = permission.toLowerCase().split("_");
      let keyword = words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Special cases for better readability
      keyword = keyword
        .replace("Timesheets", "Time Sheets")
        .replace("Payroll", "Pay Roll")
        .replace("Hr", "HR");

      return { permission, keyword };
    });
  }

  async getAllPermissions() {
    const permissions = this.mapPermissionsToKeywords();
    return permissions;
  }

  async addPermissionsToUser(
    userId: string,
    organizationId: string,
    permissions: string[]
  ) {
    // Add permissions to role
    const user = User.findById(userId as any);
    if (!user) {
      throw new Error("User not found");
    }
    const orgRole = await OrganizationRole.findOne({
      user: userId,
      organization: organizationId,
    });

    console.log(orgRole, "orgRole");

    orgRole.permissions = [...permissions];

    await orgRole.save();

    return orgRole.permissions;
  }

  async addRoleToUser(
    userId: string,
    organizationId: string,
    permission: string
  ) {
    // Add permission to role
    const user = User.findById(userId as any);
    if (!user) {
      throw new Error("User not found");
    }
    const orgRole = await OrganizationRole.findOne({
      user: userId,
      organization: organizationId,
    });

    orgRole.permissions.push(permission);

    await orgRole.save();
  }

  async removeRoleFromUser(
    userId: string,
    organizationId: string,
    permission: string
  ) {
    // Remove permission from role
    const user = User.findById(userId as any);
    if (!user) {
      throw new Error("User not found");
    }
    const orgRole = await OrganizationRole.findOne({
      user: userId,
      organization: organizationId,
    });

    orgRole.permissions = orgRole.permissions.filter(
      (perm) => perm !== permission
    );

    await orgRole.save();
  }
}

export default new PermissionRoleService();
