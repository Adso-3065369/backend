import { Router } from "express";
import { RoleController } from "../controllers/role.controller.js";
import { validateSchema, verifyToken, checkPermission } from "../middlewares/index.js";
import { roleSchema, updateRoleSchema } from "../schemas/role.schema.js";

export const roleRouter = Router();

roleRouter.use(verifyToken);

roleRouter.get("/",
  checkPermission("roles.view"),
  RoleController.getAll
);

roleRouter.post("/", 
  checkPermission("roles.create"), 
  validateSchema(roleSchema), 
  RoleController.create
);

roleRouter.get("/:id",
  checkPermission("roles.view"),
  RoleController.getById
);

roleRouter.put("/:id", 
  checkPermission("roles.update"), 
  validateSchema(updateRoleSchema), 
  RoleController.update
);

roleRouter.delete("/:id",
  checkPermission("roles.delete"),
  RoleController.delete
);