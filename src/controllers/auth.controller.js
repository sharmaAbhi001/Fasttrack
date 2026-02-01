import bcrypt from "bcrypt";

import { getJwtToken } from "../utils/jwtTokenGenerate.js";
import {UserAuth} from "../models/auth_users.js";
import { SystemAdmin } from "../models/systemAdmin.js";
import mongoose from "mongoose";
import { tenantUserAuthService } from "../services/auth.services.js";

export const login = async (req, res) => {
    
    const {email, password} = req.body;

    try {
        
        const user = await UserAuth.findOne({email});

        if(!user){
            return res.status(404).json({success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(400).json({success: false,
                message: "Invalid credentials"
            });
        }


       const systemCase = ["blocked","deleted","pending","inactive"];

       if(systemCase.includes(user.status)){
        return res.status(400).json({success: false,
            message: "User is not active"
        });
       }

       if(user.type === "tenantUser"){
        const {tokenPayload,responseData} = await tenantUserAuthService(user);

        console.log(tokenPayload)

       const token =  getJwtToken(tokenPayload);

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
     });

     return res.status(200).json({success: true,
        message: "Login successful",
        data: responseData
    });

    }

  
  const adminProfile = await SystemAdmin.findOne({
    authId: user._id
  });

  const tokenPayload = {
    authId: user._id,
    type: "systemAdmin",
    systemAdminId: adminProfile._id
  };

 const token =  getJwtToken(tokenPayload);

res.cookie("token", token, {
    httpOnly: true,
 });



        res.status(200).json({success: true,
            message: "Login successful",
            data: adminProfile
        });



    } catch (error) {
        console.log(error)
     return res.status(500).json({success: false,
        message: "Internal server error",  
        error: error.message   
     });        
    }

}

export const createSystemAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    // 1. Transaction ke liye session start karein
    const session = await mongoose.startSession();

    try {
        // 2. Transaction block start karein
        await session.withTransaction(async () => {
            
            // Check if user already exists (Session ke andar)
            const existingUser = await UserAuth.findOne({ email }).session(session);
            if (existingUser) {
                // Error throw karne par transaction apne aap abort ho jayega
                throw new Error("User already exists");
            }

            // Step 1: UserAuth create karein
            // Note: .create() mein array pass karna zaroori hai jab session use karein
            const [authUser] = await UserAuth.create(
                [{
                    name,
                    email,
                    password,
                    type: "systemAdmin",
                    status: "active"
                }], 
                { session }
            );

            // Step 2: SystemAdmin create karein
            await SystemAdmin.create(
                [{
                    name,
                    authId: authUser._id,
                    role: "super_admin"
                }], 
                { session }
            );
        });

        // Agar yahan tak pahuche toh matlab commit ho gaya
        res.status(201).json({
            success: true,
            message: "System admin created successfully"
        });

    } catch (error) {
        // Agar koi bhi step fail hua, toh kuch bhi save nahi hoga
        res.status(error.message === "User already exists" ? 400 : 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        // 3. Session ko hamesha close karein
        await session.endSession();
    }
};