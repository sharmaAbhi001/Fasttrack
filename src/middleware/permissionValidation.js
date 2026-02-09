import { RolePermission } from "../models/rolePermission.js";
import { Tenant } from "../models/tenants.js";
import { User } from "../models/users.js";
import jwt from "jsonwebtoken"

export const permissionValidation = (requiredPermissions=[]) => {
    return  async (req, res, next) => {

        try {
            
            
        // receive token cookies or header 

        // req.headers.authorization.split(" ")[1] ||
        const token =  req.cookies["token"];
        
       if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Action"
        });
      }
        
        let decodedToken;

      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

        const {authId, userId , roleId , tenantId} = decodedToken;
        // find user and check his role permission ;

        if (!authId || !userId || !roleId || !tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }


        const user = await User.findById(userId);

        if(!user || user.status !== "active"  ){
            return res.status(400).json({success: false,
                message: "Unauthorized userA"
            });
        };

         if (String(user.tenantId) !== String(tenantId)) {
        return res.status(403).json({ message: "Tenant mismatch" });
      }

      // find tenant and check its status

      const tenant = await Tenant.findById(tenantId);
      if(tenant.status !== "active"){
        return res.status(403).json({success: false,
            message: "Tenant not active"
        });
      }

      

    // find permission of user 

    const rolePermissions = await RolePermission.find({tenantId , roleId}).populate({
          path: "permissionId",
          select: "code"
        });

        console.log("mai chala ")


   const permissionCodes = rolePermissions.map(p => p.permissionId?.code).filter(Boolean);

 const hasPermission = requiredPermissions.some(rp =>
        permissionCodes.includes(rp)
      );

       if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Forbidden"
        });
      }

      req.userData = decodedToken;

      next()
   
        }catch{
       console.error("Permission Middleware Error:", error);
       return res.status(500).json({
        success: false,
        message: "Server error"
      });
        }

    }


}