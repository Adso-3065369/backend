import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller.js';
import { verifyToken, checkPermission } from '../middlewares/index.js';

/**
 * @file sales.routes.js
 * @description Definición de endpoints y protección perimetral del módulo de ventas.
 * @quality_attributes
 * - Seguridad: Middleware global de autenticación aplicado a nivel de enrutador (salesRouter.use).
 * - Restful Design: Estructura semántica de rutas transaccionales.
 */
const salesRouter = Router();

// Middleware perimetral de autenticación
salesRouter.use(verifyToken);

/**
 * @route GET /
 * @description Recupera el historial de ventas (soporta filtros dinámicos y paginación).
 * @access Privado (Requiere permiso 'sales.index')
 */
salesRouter.get(
    '/', 
    checkPermission('sales.index'), 
    SaleController.getAll
);

/**
 * @route GET /:id
 * @description Recupera el detalle completo de una venta específica y sus productos.
 * @access Privado (Requiere permiso 'sales.view')
 */
salesRouter.get(
    '/:id',
    checkPermission('sales.view'),
    SaleController.getById
);

/**
 * @route POST /
 * @description Registra una nueva transacción de venta (ACID).
 * @access Privado (Requiere permiso 'sales.create')
 */
salesRouter.post(
    '/',
    checkPermission('sales.create'),
    SaleController.create
);

export default salesRouter;