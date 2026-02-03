import { json, success } from "zod";
import { UserAuth } from "../models/auth_users.js";
import { Role } from "../models/role.js";

import { User } from "../models/users.js";
import mongoose from "mongoose";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";



export const createUser = async (req, res) => {

    const { email, password , name ,phone , address , roleId  } = req.body;
    const {tenantId} = req.userData;

    try {
        
        // create auth user
      
        const validRole = await Role.findOne({tenantId:tenantId,_id:roleId});    
        if(!validRole){
            return res.status(400).json({success: false, message: "Role not found"});
        }


        // find user already exist with email or phone 

        const userAlreadyExist = await UserAuth.findOne({email});

        if(userAlreadyExist){
            return res.status(403).json({
                success:false,
                message:"User already exist with this email"
            })
        }

          const authUser = await UserAuth.create({
            email,
            password,
            type:"tenantUser",
            
        });

        


    // create user 
    const user = await User.create({
        authId:authUser._id,
        tenantId:tenantId,
        roleId:validRole._id,
        name:name,
        phone:phone,
        address:address,
    })


  
    return res.status(201).json({success: true, message: "User created successfully",data:user});
  

    } catch (error) {
        console.log(error)
        return res.status(400).json({success: false, message: "User not created"});
    }

}

export const getUsers = async (req, res) => {

   try {
    
    const {tenantId} = req.userData;

    const users = await User.aggregate([
     {
        $match:{
            tenantId:new mongoose.Types.ObjectId(tenantId)
        }
     },
     {
        $project:{
            _id:1,
            name:1,
            email:1,
            roleId:1
        }
     },
     {
        $lookup:{
            from:"roles",
            let:{roleId:"$roleId"},
            pipeline:[
              {
                  $match:{
                    $expr:{$eq:["$_id","$$roleId"]}
                }
              },
              {
                $project:{
                    name:1,
                    _id:1
                }
              }
            ],
            as:"role"
        }
     },
     {
        $unwind:"$role"
     },
     {
        $project:{
            _id:1,
            name:1,
            email:1,
            "role.name":1,
            "role._id":1
        }
     }
    ])


    return res.status(200).json({
        success:true,
        message:"userdata fetch successfully",
        data:users
    })

   } catch (error) {
    console.log(error)
    return res.status(500).json({
        success:false,
        message:error.message
    })
   }


}



export const editUser = async (req, res) => {
    const { userId } = req.params;
    const { email, password, name, roleId } = req.body;
    const { tenantId } = req.userData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Validate required fields
        if (!email || !password || !name || !roleId) {
            return res.status(400).json({
                success: false,
                message: "Email, password, name, and roleId are required"
            });
        }

        // Check if the new role exists in the tenant
        const validRole = await Role.findOne({ tenantId, _id: roleId }, null, { session });
        if (!validRole) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Role not found" });
        }

        // Find the user
        const user = await User.findOne({ _id: userId, tenantId }, null, { session });
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Find and update auth user (email and password) - use save() to trigger pre-hooks
        const authUser = await UserAuth.findById(user.authId, null, { session });
        if (!authUser) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Auth user not found" });
        }

        authUser.email = email;
        authUser.password = password;
        await authUser.save({ session });

        // Update user (name, roleId, and email)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, roleId, email },
            { new: true, runValidators: true, session }
        );

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                roleId: updatedUser.roleId
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.log(error);
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
}

export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const user = await User.findOne({ _id: userId, tenantId }).select("_id name roleId phone address authId").lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const role = await Role.findById(user.roleId).select("_id name").lean();
        const auth = await UserAuth.findById(user.authId).select("email status").lean();

        const response = {
            id: user._id,
            name: user.name,
            email: auth?.email || null,
            role: role ? { id: role._id, name: role.name } : null,
            phone: user.phone || null,
            address: user.address || null
        };

        return res.status(200).json({ success: true, data: response });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

    export const assignUserToProject = async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { userId, projectId } = req.params;
            const { tenantId } = req.userData;
            const { startDate, endDate } = req.body;

            if (!tenantId) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Tenant not found" });
            }

            // Validate user
            const user = await User.findOne({ _id: userId, tenantId }).session(session);
            if (!user) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Validate project
            const project = await Project.findOne({ _id: projectId, tenantId }).session(session);
            if (!project) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Project not found" });
            }

            const doc = {
                tenantId,
                userId: user._id,
                projectId: project._id,
                startDate: startDate ? new Date(startDate) : new Date(),
            };

            if (endDate) doc.endDate = new Date(endDate);

            // Create membership (unique index prevents duplicates)
            await ProjectMember.create([doc], { session });

            await session.commitTransaction();

            return res.status(200).json({ success: true, message: "User assigned to project", data: { userId: user._id, projectId: project._id } });

        } catch (error) {
            await session.abortTransaction();
            console.log(error);
            if (error && error.code === 11000) {
                return res.status(400).json({ success: false, message: "User already assigned to this project" });
            }
            return res.status(500).json({ success: false, message: error.message });
        } finally {
            session.endSession();
        }
    }