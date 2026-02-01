import { json, success } from "zod";
import { UserAuth } from "../models/auth_users.js";
import { Role } from "../models/role.js";

import { User } from "../models/users.js";
import mongoose from "mongoose";
import { pipeline } from "zod/v3";


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