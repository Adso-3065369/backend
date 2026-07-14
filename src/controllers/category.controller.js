import { CategoryService } from "../services/category.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { successResponse } from "../utils/response.handler.js";

/**
 * @file category.controller.js
 * @description Controlador estandarizado para el dominio de Categorías.
 * @quality_attributes
 * - Responsabilidad Única (SRP): Se limita a la recepción de peticiones HTTP, extracción de parámetros y emisión de respuestas. La lógica de integridad se delega al servicio.
 */
export const CategoryController = {
    
    /**
     * @description Obtiene el catálogo de categorías soportando filtros dinámicos y paginación.
     */
    getAll: catchAsync(async (req, res) => {
        const filters = {
            search: req.query.search || null,
            page: req.query.page,
            limit: req.query.limit,
            paginate: req.query.paginate,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };

        let result = await CategoryService.getCategories(filters);

        // Expose hasLinkedProducts flag to be consumed by the frontend view
        if (result && Array.isArray(result.data)) {
            result.data = result.data.map(category => ({
                ...category,
                hasLinkedProducts: category.has_products || (Number(category.product_count) > 0)
            }));
        } else if (Array.isArray(result)) {
            result = result.map(category => ({
                ...category,
                hasLinkedProducts: category.has_products || (Number(category.product_count) > 0)
            }));
        }

        return successResponse(res, 200, "Lista de categorías recuperada exitosamente.", result);
    }),

    /**
     * @description Consulta una categoría específica por su llave primaria.
     */
    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const category = await CategoryService.getCategoryById(id);

        if (!category) {
            const error = new Error(`Categoría con ID ${id} no encontrada.`);
            error.statusCode = 404;
            return next(error);
        }

        const categoryWithLinked = {
            ...category,
            hasLinkedProducts: category.has_products || (Number(category.product_count) > 0)
        };

        return successResponse(res, 200, "Categoría encontrada correctamente.", categoryWithLinked);
    }),

    /**
     * @description Delega la creación de un nuevo registro de categoría.
     */
    create: catchAsync(async (req, res) => {
        const newCategory = await CategoryService.createCategory(req.body);
        return successResponse(res, 201, "Categoría creada correctamente.", newCategory);
    }),

    /**
     * @description Actualiza una categoría existente.
     */
    update: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const updatedCategory = await CategoryService.updateCategory(id, req.body);
        
        if (!updatedCategory) {
            const error = new Error(`Categoría con ID ${id} no encontrada.`);
            error.statusCode = 404;
            return next(error);
        }
        
        return successResponse(res, 200, "Categoría actualizada correctamente.", updatedCategory);
    }),

    /**
     * @description Solicita la eliminación de una categoría (sujeto a validación de integridad relacional en el servicio).
     */
    delete: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        await CategoryService.deleteCategory(id);
        return successResponse(res, 200, "Categoría eliminada correctamente del sistema.");
    }),

    /**
     * @description Obtiene los productos anidados bajo una categoría específica.
     */
    getProductsByCategory: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const products = await CategoryService.getProductsForCategory(id);
        
        return successResponse(res, 200, "Productos de la categoría obtenidos exitosamente.", products);
    })
};