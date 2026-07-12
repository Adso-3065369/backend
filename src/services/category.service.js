import { CategoryModel } from "../models/category.model.js";
import { ProductModel } from "../models/product.model.js";

/**
 * @file category.service.js
 * @description Capa de negocio para la gestión de categorías.
 * @quality_attributes
 * - Encapsulamiento: Evalúa reglas de negocio críticas, como la prevención de borrado si existen relaciones de integridad (productos asociados).
 * - Orquestación: Centraliza las validaciones cruzadas entre CategoryModel y ProductModel.
 */
export const CategoryService = {
  
    /**
     * @description Evalúa los filtros solicitados y orquesta la consulta dinámica.
     * @param {Object} filters - Diccionario de parámetros de URL.
     * @returns {Promise<Object|Array>} Estructura paginada o arreglo plano.
     */
    getCategories: async (filters = {}) => {
        if (String(filters.paginate) === 'false') {
            return await CategoryModel.findAllDynamic(filters);
        }

        const limit = Number(filters.limit) || 10;
        const page = Number(filters.page) || 1;
        const offset = (page - 1) * limit;

        // Clonación defensiva: Creamos un nuevo objeto para la base de datos
        const dbQueryParams = {
            ...filters,
            limit,
            offset
        };

        const [totalItems, categories] = await Promise.all([
            CategoryModel.countDynamic(dbQueryParams),
            CategoryModel.findAllDynamic(dbQueryParams)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: categories,
            meta: {
                currentPage: page,
                lastPage: totalPages,
                itemsPerPage: limit,
                totalItems: totalItems,
                nextPage: page < totalPages ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null
            }
        };
    },

    /**
     * @description Recupera una categoría por su ID.
     * @param {number|string} id - Identificador.
     */
    getCategoryById: async (id) => {
        return await CategoryModel.findById(Number(id));
    },

    /**
     * @description Crea una categoría.
     * @param {Object} data - Datos entrantes validados.
     */
    createCategory: async (data) => {
        return await CategoryModel.create(data);
    },

    /**
     * @description Actualiza una categoría existente.
     * @param {number|string} id - Identificador.
     * @param {Object} data - Datos a actualizar.
     */
    updateCategory: async (id, data) => {
        return await CategoryModel.update(Number(id), data);
    },

    /**
     * @description Elimina una categoría aplicando validación de integridad referencial.
     * @param {number|string} id - Identificador de la categoría.
     * @throws {Error} 404 si no existe, 409 si tiene productos asociados.
     */
    deleteCategory: async (id) => {
        const categoryId = Number(id);
        const categoryExists = await CategoryModel.findById(categoryId);
        
        if (!categoryExists) {
            const error = new Error(`No se pudo eliminar: Categoría con ID ${categoryId} no encontrada.`);
            error.statusCode = 404;
            throw error;
        }

        const linkedProducts = await ProductModel.findByCategoryId(categoryId);
        if (linkedProducts && linkedProducts.length > 0) {
            const error = new Error("Violación de integridad: No se puede eliminar la categoría porque tiene productos vinculados.");
            error.statusCode = 409; 
            throw error;
        }

        return await CategoryModel.delete(categoryId);
    },

    /**
     * @description Orquesta la consulta de productos pertenecientes a una categoría.
     * @param {number|string} id - Identificador de la categoría.
     * @throws {Error} 404 si la categoría no existe.
     */
    getProductsForCategory: async (id) => {
        const categoryId = Number(id);
        const categoryExists = await CategoryModel.findById(categoryId);
        
        if (!categoryExists) {
            const error = new Error(`La categoría con ID ${categoryId} no existe.`);
            error.statusCode = 404;
            throw error;
        }

        return await ProductModel.findByCategoryId(categoryId);
    }
};