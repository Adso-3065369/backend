import { Router } from "express";
import { verifyToken, checkPermission, validateSchema } from "../middlewares/index.js";
import { UserController } from "../controllers/user.controller.js";
import { assignRolesSchema } from "../schemas/user.schema.js";

/**
 * @file user.routes.js
 * @description Definición de endpoints RESTful para la gestión del módulo de usuarios y RBAC.
 * @quality_attributes
 * - Seguridad: Implementa protección perimetral unificada mediante middleware JWT.
 * - Cohesión: Alineación estricta de rutas transaccionales con el contrato del frontend.
 */
export const userRouter = Router();

userRouter.use(verifyToken);

/**
 * @route GET /
 * @description Recupera el directorio de usuarios (soporta paginación y filtros dinámicos).
 */
userRouter.get("/",
  checkPermission("users.index"),
  UserController.getAll
);

/**
 * @route GET /:id
 * @description Consulta detallada de un usuario específico.
 */
userRouter.get("/:id",
  checkPermission("users.show"),
  UserController.getById
);

/**
 * @route POST /
 * @description Registra un nuevo usuario en el sistema.
 */
userRouter.post("/",
  checkPermission("users.create"), // Asumiendo que existe el permiso
  UserController.create
);

/**
 * @route PUT /:id
 * @description Actualiza la información básica de un usuario.
 */
userRouter.put("/:id",
  checkPermission("users.update"),
  UserController.update
);

/**
 * @route DELETE /:id
 * @description Elimina lógicamente o físicamente a un usuario.
 */
userRouter.delete("/:id",
  checkPermission("users.delete"),
  UserController.delete
);

/**
 * @route PUT /:id/roles
 * @description Sincroniza la matriz de roles asignados a un usuario.
 */
userRouter.put("/:id/roles",
  checkPermission("roles.assign"),
  validateSchema(assignRolesSchema),
  UserController.assignRoles
);