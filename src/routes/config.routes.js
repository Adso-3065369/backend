import { Router } from "express";
import { ConfigController } from "../controllers/config.controller.js";
import { verifyToken, validateSchema, checkPermission } from "../middlewares/index.js";
import { configSchema } from "../schemas/config.schema.js";

/**
 * @file config.routes.js
 * @description Endpoints RESTful para la configuración global del negocio.
 * @quality_attributes
 * - Seguridad: Protegido por JWT. El PUT requiere permiso de administrador.
 * - Singleton lógico: Solo existe la configuración con id = 1.
 */
export const configRouter = Router();

/**
 * @route GET /api/config/:id
 * @description Recupera la configuración actual del negocio.
 */
configRouter.get(
    "/:id",
    verifyToken,
    ConfigController.getById
);

/**
 * @route PUT /api/config/:id
 * @description Crea o actualiza la configuración del negocio.
 */
configRouter.put(
    "/:id",
    verifyToken,
    checkPermission('config.update'),
    validateSchema(configSchema),
    ConfigController.update
);
