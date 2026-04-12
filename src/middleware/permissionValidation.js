import { RolePermission } from "../models/rolePermission.js";
import { Role } from "../models/role.js";
import { Tenant } from "../models/tenants.js";
import { User } from "../models/users.js";
import jwt from "jsonwebtoken";
import { extractBearerToken } from "../utils/extractBearerToken.js";

export const permissionValidation = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      const token = extractBearerToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Action",
        });
      }

      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      const { authId, userId, roleId, tenantId } = decodedToken;

      if (!authId || !userId || !roleId || !tenantId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const user = await User.findById(userId);

      if (!user || user.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Unauthorized userA",
        });
      }

      if (String(user.tenantId) !== String(tenantId)) {
        return res.status(403).json({ message: "Tenant mismatch" });
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant || tenant.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Tenant not active",
        });
      }

      const rolePermissions = await RolePermission.find({ tenantId, roleId }).populate({
        path: "permissionId",
        select: "code",
      });

      const permissionCodes = rolePermissions.map((p) => p.permissionId?.code).filter(Boolean);

      const roleDoc = await Role.findById(roleId).select("name").lean();
      const roleNameUpper = (roleDoc?.name ?? "").toUpperCase();
      const hasFullAccess =
        permissionCodes.includes("FULL_ACCESS") || roleNameUpper === "OWNER";
      const hasPermission =
        hasFullAccess ||
        requiredPermissions.length === 0 ||
        requiredPermissions.some((rp) => permissionCodes.includes(rp));

      if (!hasPermission) {
        const need =
          requiredPermissions.length > 0
            ? `Your role is missing a required permission (needs one of: ${requiredPermissions.join(
                ", "
              )}). The organization owner can add it under Roles & access.`
            : "Forbidden";
        return res.status(403).json({
          success: false,
          message: need,
        });
      }

      req.userData = {
        ...decodedToken,
        hasFullAccess,
        /** True only when the tenant role name is OWNER (not merely FULL_ACCESS permission). */
        isOwner: roleNameUpper === "OWNER",
      };

      next();
    } catch (error) {
      console.error("Permission Middleware Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};
