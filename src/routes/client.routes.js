import { Router } from "express";
import { ClientController } from "../controllers/client.controller.js";
import { 
    verifyToken,
    checkPermission,
    validateSchema
} from "../middlewares/index.js";
import { clientSchema } from "../schemas/client.schema.js";

/**
 * @file client.routes.js
 * @description Definición de endpoints RESTful para la gestión del directorio de clientes.
 * @quality_attributes
 * - Seguridad: Protección perimetral con JWT y control de acceso basado en roles (RBAC).
 * - Validación: Sanitización y validación estricta del body mediante Zod.
 */
export const clientRouter = Router();

clientRouter.use(verifyToken);

/**
 * @route GET /
 * @description Obtiene el directorio de clientes (Soporta paginación y filtros dinámicos).
 */
clientRouter.get(
    "/",
    checkPermission("clients.index"),
    ClientController.getAll
);

/**
 * @route GET /:id
 * @description Obtiene el perfil detallado de un cliente específico.
 */
clientRouter.get(
    "/:id",
    checkPermission("clients.view"),
    ClientController.getById
);

/**
 * @route POST /
 * @description Registra un nuevo cliente validando colisiones de documento.
 */
clientRouter.post(
    "/",
    checkPermission("clients.create"),
    validateSchema(clientSchema),
    ClientController.create
);

/**
 * @route PUT /:id
 * @description Actualiza los datos de un cliente existente.
 */
clientRouter.put(
    "/:id",
    checkPermission("clients.update"),
    validateSchema(clientSchema),
    ClientController.update
);

/**
 * @route DELETE /:id
 * @description Elimina un cliente verificando integridad referencial con ventas.
 */
clientRouter.delete(
    "/:id",
    checkPermission("clients.delete"),
    ClientController.delete
);