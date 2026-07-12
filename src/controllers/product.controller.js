import { ProductService } from '../services/product.service.js';
import { successResponse } from '../utils/response.handler.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * @file product.controller.js
 * @description Controlador estandarizado para la gestión del catálogo de productos.
 * @quality_attributes
 * - Responsabilidad Única (SRP): Se encarga exclusivamente de la comunicación HTTP y la delegación hacia el servicio.
 * - Manejo de Errores: Utiliza 'catchAsync' para centralizar excepciones y evitar bloques try-catch repetitivos.
 * - Estandarización: Uniformiza las respuestas hacia el cliente mediante 'successResponse'.
 */
export const ProductController = {

    /**
     * @description Obtiene el catálogo de productos basándose en filtros dinámicos.
     * @param {Object} req - Objeto de petición Express (contiene query params: search, page, limit, paginate, etc).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Respuesta HTTP 200 con el catálogo paginado o plano.
     */
    getAll: catchAsync(async (req, res) => {
        // Empaquetado estricto de parámetros de URL (Dynamic Query String)
        const filters = {
            search: req.query.search || null,   // Búsqueda general (nombre o código)
            name: req.query.name || null,       // Búsqueda estricta por nombre
            page: req.query.page,
            limit: req.query.limit,
            is_active: req.query.is_active,     // Filtro de estado
            category_id: req.query.category_id, // Filtro por categoría
            paginate: req.query.paginate,       // Interruptor booleano en string ('true'|'false')
            sortBy: req.query.sortBy,           // Columna para el ORDER BY
            sortOrder: req.query.sortOrder      // ASC o DESC
        };

        const result = await ProductService.getProducts(filters);        
        
        return successResponse(
            res, 
            200, 
            "Catálogo de productos recuperado exitosamente.", 
            result
        );
    }),

    /**
     * @description Consulta un producto específico por ID.
     * @param {Object} req - Objeto de petición (params contiene el ID).
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware para delegar errores.
     * @returns {Promise<void>} Respuesta HTTP 200 con el producto o 404 si no existe.
     */
    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const product = await ProductService.getProductById(id);

        if (!product) {
            const error = new Error(`El producto con ID ${id} no existe en el catálogo.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Producto obtenido exitosamente.", product);
    }),

    /**
     * @description Crea un nuevo recurso de producto.
     * @param {Object} req - Objeto de petición (body contiene los datos del producto).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Respuesta HTTP 201 confirmando la creación.
     */
    create: catchAsync(async (req, res) => {
        const productData = req.body;
        const newProduct = await ProductService.createProduct(productData);
        return successResponse(res, 201, "Producto registrado exitosamente.", newProduct);
    }),

    /**
     * @description Actualiza un producto existente mediante PUT.
     * @param {Object} req - Objeto de petición (params: id, body: data).
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware para delegar errores.
     * @returns {Promise<void>} Respuesta HTTP 200 con el producto actualizado o 404 si no existe.
     */
    update: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const productData = req.body;
        
        const updatedProduct = await ProductService.updateProduct(id, productData);

        if (!updatedProduct) {
            const error = new Error(`No se pudo actualizar. El producto con ID ${id} no fue encontrado.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Producto actualizado exitosamente.", updatedProduct);
    }),


    toggleStatus: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedProduct = await ProductService.toggleProductStatus(id, isActive);

    if (!updatedProduct) {
        const error = new Error(`Producto con ID ${id} no encontrado.`);
        error.statusCode = 404;
        return next(error);
    }

    const action = isActive ? 'activado' : 'desactivado';
    return successResponse(res, 200, `Producto ${action} exitosamente.`, updatedProduct);
}),

    /**
     * @description Elimina físicamente un registro de producto.
     * @param {Object} req - Objeto de petición (params: id).
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware para delegar errores.
     * @returns {Promise<void>} Respuesta HTTP 200 de éxito o 404 si no existe.
     */
    delete: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const isDeleted = await ProductService.deleteProduct(id);

        if (!isDeleted) {
            const error = new Error(`No se pudo eliminar. El producto con ID ${id} no fue encontrado.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Producto eliminado correctamente del sistema.");
    })
};