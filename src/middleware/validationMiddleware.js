import {z , ZodError } from "zod"

export function validateData (schema) {

    return ( req,res,next ) =>{

        try {
            schema.parse(req.body);
            next()

        } catch (error) {
            
            if(error instanceof ZodError){

                
                const errorMessage = error?.issues.map((issue)=>({
                    message: `${issue.path.join('.')} is ${issue.message}`
                }))
          return  res.status(400).json({error:"Invalid data",details:errorMessage,
           })
            } else {
                return res.json({ error: 'Internal Server Error' });
            } 
            
        }

    };

}