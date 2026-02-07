import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./libs/db.config.js";
dotenv.config();
import authRouter from "./routes/auth.route.js";
import tenantRouter from "./routes/tenant.routes.js";
import projectRouter from "./routes/project.routes.js";
import userRouter from "./routes/user.routes.js";
import workerRouter from "./routes/worker.routes.js";
import attendanceRouter from "./routes/attendance.route.js";





const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



const PORT = process.env.PORT || 3000;


app.use("/api/auth",authRouter)
app.use("/api/tenant",tenantRouter)
app.use("/api/project",projectRouter)
app.use("/api/user",userRouter)
app.use("/api/worker",workerRouter)
app.use("/api/attendance",attendanceRouter)


connectDB().then( async () => {


    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}).catch((err) => console.log(err));
