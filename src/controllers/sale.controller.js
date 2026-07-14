import { SaleService } from '../services/sale.service.js';
import { successResponse } from '../utils/response.handler.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * @file sale.controller.js
 * @description Controlador estandarizado para el módulo transaccional de ventas.
 * @quality_attributes
 * - Responsabilidad Única (SRP): Se encarga exclusivamente de la orquestación HTTP.
 * - Dynamic Abstraction: Empaqueta los parámetros de URL en un DTO de filtros unificado.
 */
export const SaleController = {

    /**
     * @description Obtiene la lista de ventas basándose en filtros dinámicos.
     * @param {Object} req - Objeto de petición Express (query params: search, page, limit, paginate, sortBy).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Respuesta HTTP 200 con historial de ventas.
     */
    getAll: catchAsync(async (req, res) => {
        // Empaquetado estricto de parámetros de URL
        const filters = {
            search: req.query.search || null,
            date: req.query.date || null, // Se agrega la siguiente linea para capturar la fecha 
            page: req.query.page,
            limit: req.query.limit,
            paginate: req.query.paginate,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };

        const result = await SaleService.getSalesList(filters);
        
        return successResponse(
            res, 
            200, 
            "Historial de ventas recuperado exitosamente.", 
            result
        );
    }),

    /**
     * @description Obtiene el detalle transaccional de una venta por su ID.
     * @param {Object} req - Objeto de petición (params contiene el ID).
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware delegado de errores.
     * @returns {Promise<void>} Respuesta HTTP 200 con cabecera y detalles.
     */
    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const sale = await SaleService.getSaleById(id);
        
        if (!sale) {
            const error = new Error(`La venta con ID ${id} no fue encontrada en el sistema.`);
            error.statusCode = 404;
            return next(error);
        }
        
        return successResponse(res, 200, "Detalle de la venta obtenido exitosamente.", sale);
    }),

    /**
     * @description Inicia el proceso de registro para una nueva venta.
     * @param {Object} req - Objeto de petición (body contiene client_id y details).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Respuesta HTTP 201 confirmando la transacción.
     */
    create: catchAsync(async (req, res) => {
        const { client_id, details } = req.body;

        // 1. VALIDACIÓN PREVENTIVA (Fail-Fast)
        if (!client_id) {
            const err = new Error("El cliente es obligatorio para procesar la venta.");
            err.statusCode = 422;
            throw err;
        }

        if (!details || !Array.isArray(details) || details.length === 0) {
            const err = new Error("La venta debe contener al menos un producto.");
            err.statusCode = 422;
            throw err;
        }

        // 2. EJECUCIÓN (Solo si la validación pasa)
        const user_id = req.user.id;
        const newSale = await SaleService.processSale(client_id, user_id, details);
        
        return successResponse(res, 201, "Transacción de venta registrada exitosamente.", newSale);
    })
};