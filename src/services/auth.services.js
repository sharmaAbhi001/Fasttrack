import { User } from "../models/users.js";
import {Tenant} from "../models/tenants.js";


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
      userName: authUser.name,
      type: authUser.type,
      roleId: tenantUser.roleId,
      userId: tenantUser._id,
      userName: tenantUser.name,
      tenantName: tenant.name
    }
  };
};