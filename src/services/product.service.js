import { ProductModel } from "../models/product.model.js";

/**
 * @file product.service.js
 * @description Capa de negocio (Service Layer) que actúa como intermediario entre los controladores y el modelo (DAO).
 * @quality_attributes
 * - Encapsulamiento: Abstrae la lógica de persistencia y las consultas a base de datos.
 * - Single Responsibility Principle (SRP): Coordina la paginación y las métricas de negocio sin manipular directamente el pool de conexiones.
 */
export const ProductService = {
 
  /**
   * @description Recupera productos aplicando filtros, ordenamiento y paginación.
   * @param {Object} filters - Objeto de configuración para la consulta.
   * @param {boolean|string} [filters.paginate] - Interruptor: si es 'false', devuelve un array plano; si no, devuelve objeto paginado.
   * @param {number} [filters.limit=10] - Cantidad máxima de registros.
   * @param {number} [filters.page=1] - Número de página actual.
   * @returns {Promise<Object|Array>} Estructura de paginación (data/meta) o Array plano de productos.
   */
  getProducts: async (filters) => {
      // 1. Interruptor de Paginación (Modo Plano para Ventas/Combos)
      if (String(filters.paginate) === 'false') {
          return await ProductModel.findAllDynamic(filters);
      }

      // 2. Modo Paginado Estándar (Tablas e Inventario)
      const limit = Number(filters.limit) || 10;
      const page = Number(filters.page) || 1;
      const offset = (page - 1) * limit;

      // Inyectamos offset y limit estructurados para el modelo
      filters.limit = limit;
      filters.offset = offset;

      // Ejecución concurrente
      const [totalItems, products] = await Promise.all([
          ProductModel.countDynamic(filters),
          ProductModel.findAllDynamic(filters)
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
          data: products,
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
   * @description Consulta un producto específico por su identificador único.
   * @param {number|string} id - Identificador del producto.
   * @returns {Promise<Object|null>} El objeto del producto o null si no se encuentra.
   */
  getProductById: async (id) => {
    return await ProductModel.findById(id);
  },

  /**
   * @description Obtiene todos los productos asociados a una categoría específica.
   * @deprecated Considerar migrar el uso a 'getProducts' pasando el filtro 'category_id'.
   * @param {number} categoryId - Identificador de la categoría.
   * @returns {Promise<Array>} Listado de productos de la categoría.
   */
  getProductsByCategory: async (categoryId) => {
    return await ProductModel.findByCategoryId(categoryId);
  },

  /**
   * @description Crea un nuevo registro de producto en el catálogo.
   * @param {Object} productData - Datos validados del producto.
   * @returns {Promise<Object>} El nuevo producto persistido.
   */
  createProduct: async (productData) => {
    return await ProductModel.create(productData);
  },

  /**
   * @description Actualiza la información de un producto existente.
   * @param {number} id - ID del producto a modificar.
   * @param {Object} productData - Nuevos datos del producto.
   * @returns {Promise<Object|null>} El producto actualizado o null.
   */
  updateProduct: async (id, productData) => {
    return await ProductModel.update(id, productData);
  },

  toggleProductStatus: async (id, isActive) => {
    return await ProductModel.toggleStatus(id, isActive);
},

  /**
   * @description Elimina un producto del catálogo de forma permanente.
   * @param {number} id - ID del producto a eliminar.
   * @returns {Promise<boolean>} True si se realizó la eliminación exitosamente.
   */
  deleteProduct: async (id) => {
    return await ProductModel.delete(id);
  },

  /**
   * @description Obtiene métricas generales sobre el inventario (Valor total y cantidad).
   * @returns {Promise<Object>} Estadísticas de inventario.
   */
  getInventoryMetrics: async () => {
    return await ProductModel.getInventoryStats();
  },

  /**
   * @description Identifica productos con existencias bajo el umbral crítico.
   * @constant {number} MIN_STOCK_THRESHOLD - Define el nivel mínimo para considerar un producto como "stock crítico".
   * @returns {Promise<Object>} Cuenta de productos en stock crítico.
   */
  getCriticalStock: async () => {
    const MIN_STOCK_THRESHOLD = 5; 
    return await ProductModel.getCriticalStockCount(MIN_STOCK_THRESHOLD);
  }
};