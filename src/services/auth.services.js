import { User } from "../models/users.js";
import { Tenant } from "../models/tenants.js";
import { Role } from "../models/role.js";
import { RolePermission } from "../models/rolePermission.js";


export const tenantUserAuthService = async (authUser) => {
  // 1. find tenant user
  const tenantUser = await User.findOne({ authId: authUser._id })
    .select("-password");

  if (!tenantUser) {
    throw new Error("TENANT_USER_NOT_FOUND");
  }

  if (tenantUser.status !== "active") {
    throw new Error("TENANT_USER_INACTIVE");
  }

  // 2. find tenant
  const tenant = await Tenant.findById(tenantUser.tenantId);

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  if (tenant.status !== "active") {
    throw new Error("TENANT_INACTIVE");
  }

  const role = await Role.findById(tenantUser.roleId).select("name").lean();
  const rolePermissions = await RolePermission.find({
    tenantId: tenantUser.tenantId,
    roleId: tenantUser.roleId,
  }).populate({ path: "permissionId", select: "code" });
  const permissionCodes = rolePermissions.map((p) => p.permissionId?.code).filter(Boolean);
  const roleNameUpper = (role?.name ?? "").toUpperCase();
  const hasFullAccess =
    permissionCodes.includes("FULL_ACCESS") || roleNameUpper === "OWNER";

  // 3. return data (NO res here)
  return {
    tokenPayload: {
      authId: authUser._id,
      type: authUser.type,
      roleId: tenantUser.roleId,
      tenantId: tenantUser.tenantId,
      userId: tenantUser._id
    },
    responseData: {
      authId: authUser._id,
      type: authUser.type,
      roleId: tenantUser.roleId,
      userId: tenantUser._id,
      userName: tenantUser.name,
      tenantName: tenant.name,
      roleName: role?.name ?? "",
      hasFullAccess,
      /** Permission codes for this tenant role (UI nav + client checks). */
      permissionCodes,
    }
  };
};