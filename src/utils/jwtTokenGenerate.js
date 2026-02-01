import jwt from "jsonwebtoken"

export const getJwtToken = (data) => {
    const token = jwt.sign(data,process.env.JWT_SECRET_KEY,{
    expiresIn: "7d",
    algorithm: "HS256",
  });
    return token
}   