import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";

import { 
  validateSchema,
  verifyToken,
  checkPermission  
} from "../middlewares/index.js";

import { productSchema } from "../schemas/product.schema.js";

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
  verifyToken, 
  checkPermission("products.index"), 
  ProductController.getAll
);

/**
 * @route GET /:id
 * @description Consulta detallada de un producto específico.
 * @access Privado (Requiere permiso 'products.view')
 */
productRouter.get(
  "/:id", 
  verifyToken, 
  checkPermission("products.view"), 
  ProductController.getById
);

/**
 * @route POST /
 * @description Registra un nuevo producto en el inventario.
 * @access Privado (Requiere permiso 'products.create')
 * @middleware Valida el cuerpo de la petición contra 'productSchema'.
 */
productRouter.post(
  "/", 
  verifyToken, 
  checkPermission("products.create"), 
  validateSchema(productSchema), 
  ProductController.create
);

/**
 * @route PUT /:id
 * @description Actualiza la información de un producto existente.
 * @access Privado (Requiere permiso 'products.update')
 * @middleware Valida el cuerpo de la petición contra 'productSchema'.
 */
productRouter.put(
  "/:id", 
  verifyToken, 
  checkPermission("products.update"), 
  validateSchema(productSchema), 
  ProductController.update
);

/**
 * @route DELETE /:id
 * @description Elimina un registro de producto del sistema.
 * @access Privado (Requiere permiso 'products.delete')
 */
productRouter.delete(
  "/:id", 
  verifyToken, 
  checkPermission("products.delete"), 
  ProductController.delete
);