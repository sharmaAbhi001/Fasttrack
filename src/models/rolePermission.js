import mongoose , { Schema } from "mongoose";



const tenantRolePermissionSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  roleId: {
    type: Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  permissionId: {
    type: Schema.Types.ObjectId,
    ref: "Permission",
    required: true,
  },
},{ timestamps: true });


tenantRolePermissionSchema.index(
 {tenantId:1,roleId:1,permissionId:1},
 {unique:true}
);

export const RolePermission = mongoose.models.RolePermission || mongoose.model("RolePermission", tenantRolePermissionSchema);