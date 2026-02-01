import express from "express";
import { configureRolesInTenant, createTenant, getGlobalRolesAndPermissions, getTenantRoles } from "../controllers/tenant.controller.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { tenantCreateSchema } from "../Schemas/tenantSchema.js";
import { permissionValidation } from "../middleware/permissionValidation.js";


const router = express.Router();

router.post("/signup",validateData(tenantCreateSchema), createTenant);
router.get("/roles",getGlobalRolesAndPermissions)
router.post("/role-configure",permissionValidation(["FULL_ACCESS"]),configureRolesInTenant);
router.get("/roles-local",permissionValidation(["FULL_ACCESS"]),getTenantRoles);
// router.post("/login", loginTenant);
// router.get("/", getTenant);
// router.patch("/", updateTenant);
// router.delete("/", deleteTenant);


export default router;