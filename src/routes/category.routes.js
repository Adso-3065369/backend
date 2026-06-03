import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { 
  validateSchema,
  verifyToken,
  checkPermission  
} from "../middlewares/index.js";
import { categorySchema } from "../schemas/category.schema.js";

/**
 * @file category.routes.js
 * @description Definición de endpoints RESTful para la gestión del módulo de categorías.
 * @quality_attributes
 * - Seguridad: Implementa autenticación (verifyToken) y control de acceso (checkPermission).
 * - Validación: Utiliza esquemas Zod (validateSchema) para prevenir datos malformados.
 */
export const categoryRouter = Router();

categoryRouter.get(
  "/",
  verifyToken,
  checkPermission("categories.index"),
  CategoryController.getAll
);

categoryRouter.get(
  "/:id",
  verifyToken,
  checkPermission("categories.view"),
  CategoryController.getById
);

categoryRouter.post(
  "/",
  verifyToken,
  checkPermission("categories.create"),
  validateSchema(categorySchema),
  CategoryController.create
);

categoryRouter.put(
  "/:id",
  verifyToken,
  validateSchema(categorySchema),
  checkPermission("categories.update"),
  CategoryController.update
);

categoryRouter.delete(
  "/:id",
  verifyToken,
  checkPermission("categories.delete"),
  CategoryController.delete
);

categoryRouter.get(
  "/:id/products",
  verifyToken, 
  checkPermission("categories.view"),
  CategoryController.getProductsByCategory
);