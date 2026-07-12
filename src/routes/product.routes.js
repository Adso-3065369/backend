import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";

import { 
  validateSchema,
  verifyToken,
  checkPermission  
} from "../middlewares/index.js";

import { productSchema, productStatusSchema  } from "../schemas/product.schema.js";

/**
 * @file product.routes.js
 * @description Definición de endpoints RESTful para la gestión del módulo de productos.
 * @quality_attributes
 * - Seguridad: Implementa autenticación (verifyToken) y control de acceso (checkPermission) en todas las rutas.
 * - Validación: Utiliza esquemas Zod (validateSchema) para garantizar la integridad de los datos en entrada.
 * - Restful Design: Utiliza verbos HTTP estándar para las operaciones CRUD.
 */
export const productRouter = Router();

/**
 * @route GET /
 * @description Obtiene el catálogo de productos (paginado o plano según parámetros).
 * @access Privado (Requiere permiso 'products.index')
 */
productRouter.get(
  "/", 
  ProductController.getAll
);

productRouter.get(
  "/:id", 
  ProductController.getById
);

productRouter.post(
  "/", 
  validateSchema(productSchema), 
  ProductController.create
);

productRouter.put(
  "/:id", 
  validateSchema(productSchema), 
  ProductController.update
);

/**
 * @route PATCH /:id/status
 * @description Actualiza únicamente el estado activo/inactivo de un producto.
 * @access Privado (Requiere permiso 'products.update')
 */
productRouter.patch(
  "/:id/status",
  verifyToken,
  checkPermission("products.update"),
  validateSchema(productStatusSchema),
  ProductController.toggleStatus
);

/**
 * @route DELETE /:id
 * @description Elimina un registro de producto del sistema.
 * @access Privado (Requiere permiso 'products.delete')
 */
productRouter.delete(
  "/:id", 
  ProductController.delete
);