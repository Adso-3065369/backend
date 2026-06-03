import { Router } from "express";

import { 
    verifyToken,
    checkPermission  
} from "../middlewares/index.js";

import { getPermissions } from "../controllers/permission.controller.js";

export const permissionRouter = Router();

// Proteger todas las rutas de este archivo
permissionRouter.use(verifyToken);

permissionRouter.get("/",
  verifyToken,
  checkPermission("permissions.index"),
  getPermissions
);