import { Tenant } from "../models/tenants.js";
import { User } from "../models/users.js";
import { UserAuth } from "../models/auth_users.js";
import { Role } from "../models/role.js";
import { Permission } from "../models/permission.js";
import { RolePermission } from "../models/rolePermission.js";
import mongoose from "mongoose";
import { RoleTemplate } from "../models/rolesTemplate.js";

export const createTenant = async (req, res) => {
   const {name, email , password , phone , address , companyName , gstNumber  } = req.body; 

   const session = await mongoose.startSession();
     session.startTransaction();


   try {
    

    // check user already exist with this email or not 

    const userAlreadyExist = await UserAuth.findOne({email});

    if(userAlreadyExist){
        return res.status(400).json({success: false,
            message: "User already exist with this email"
        });
    }

    // create auth user  with type tenant 

    const authUsers  = await UserAuth.create([{email , password , type: "tenantUser"}],{session}); 
    const authUser = authUsers[0];
    // create tenant 

    const tenants = await Tenant.create([{name, companyName, gSTNumber: gstNumber, address, status: "active"}],{session});
    const tenant = tenants[0];
    // create tenant user with owner role and tenant id
    
    // find owner role id

    // 3. Find Global Role & Permission
        const ownerRole = await RoleTemplate.findOne({ name: "OWNER" });

        if (!ownerRole ) {
            throw new Error("System Roles/Permissions not initialized properly");
        }

        // local or tenant role 

        const tenantRoles = await Role.create([{
            tenantId: tenant._id,
            name: ownerRole.name,
            isSystem: true,
        }],{session});


   

    const tenantUsers = await User.create([{
        authId: authUser._id,
        tenantId: tenant._id,
        roleId: tenantRoles[0]._id,
        name,
        email,
        phone,
        address
    }],{session});

    const tenantUser = tenantUsers[0];

     const rolePermissions = await RolePermission.create([{
        tenantId: tenant._id,
        roleId: tenantRoles[0]._id,
        permissionId: ownerRole.defaultPermissions,
    }],{session});


    // create tenant role permission

   


   const responseData = {
    user: {
        id: tenantUser._id,
        name: tenantUser.name,
        email: tenantUser.email,
        roleId: tenantUser.roleId,
        role: "OWNER"
    },
    tenant: {
        id: tenant._id,
        companyName: tenant.companyName,
        status: tenant.status
    },
    setupComplete: true 

   }

    await session.commitTransaction();

   res.status(200).json({success: true,
    message: "Tenant created successfully",
    data: responseData
   });



   } catch (error) {

    await session.abortTransaction();
    console.log(error)
    res.status(400).json({success: false,
        message: error.message
    });
    
   }finally{
    session.endSession();
   }




}


export const getGlobalRolesAndPermissions = async (req, res) =>{
    try{

     
        const rolesAndPermission = await RoleTemplate.aggregate([
  {
    $lookup: {
      from: "permissions",
      localField: "defaultPermissions",
      foreignField: "_id",
      as: "permissions"
    }
  },
  {
    $project: {
      _id: 1,
      name: 1,
      permissions: {
        $map: {
          input: "$permissions",
          as: "p",
          in: {
            _id: "$$p._id",
            code: "$$p.code"
          }
        }
      }
    }
  }
]);

        return res.status(200).json({success: true, data: rolesAndPermission});


    }catch(error){
      console.log(error);
      return res.status(400).json({success: false, message: error.message});
    }

};

export const configureRolesInTenant = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

  try{
    const {roleId,permissionIds} = req.body;
    const {tenantId} = req.userData;

    //validate role id it is global or not 

    const uniquePermissionId = [...new Set(permissionIds)];

    const globalRole = await RoleTemplate.findOne({_id:roleId},null,{session});

    if(!globalRole){
      return res.status(400).json({success: false, message: "Role not found"});
    }

    
    const existingRole = await Role.findOne({tenantId, name: globalRole.name},null,{session});

    if(existingRole){
      return res.status(400).json({success: false, message: "Role already configured talk to customer support"});
    }

    const permissions = await Permission.find({_id:{$in:uniquePermissionId}},null,{session});

    if(permissions.length !== uniquePermissionId.length){
      return res.status(400).json({success: false, message: "Invalid permission ids"});
    }

    // create role in tenant

    const tenantRole = await Role.create([{
      tenantId,
      name: globalRole.name,
      isSystem: true
    }],{session});


    // create rolePermission in tenant

    const docs = uniquePermissionId.map(pid => ({
      tenantId,
      roleId: tenantRole[0]._id,
      permissionId:pid
    }));

    const tenantRolePermission = await RolePermission.create([...docs],session);

    console.log(tenantRolePermission[0])

    await session.commitTransaction();

    return res.status(200).json({success: true, message: "Role configured successfully"});


  } catch (error) {
    console.log(error)
    return res.status(400).json({success: false, message: error.message});
  }finally{
    session.endSession();
  }
};

export const getTenantRoles = async (req,res) => {
    
   try {
     const {tenantId} = req.userData;
    const roles = await Role.find({tenantId}).select("_id name");
    return res.status(200).json({success: true, data: roles});
   } catch (error) {
    return res.status(400).json({success: false, message: error.message});
   }

}