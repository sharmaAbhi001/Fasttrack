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
          return  res.json({error:"Invalid data",details:errorMessage,
           })
            } else {
                return res.json({ error: 'Internal Server Error' });
            } 
            
        }

    };

}