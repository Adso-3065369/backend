import pool from "../config/db.js";

/**
 * @file product.model.js
 * @description Capa de acceso a datos (DAO) para la entidad 'products'.
 * @quality_attributes
 * - Mantenibilidad: Implementa un patrón Dynamic Query Builder para reducir la duplicidad de consultas.
 * - Seguridad: Utiliza sentencias preparadas para prevenir ataques de Inyección SQL.
 * - Modulabilidad: Separa la lógica de persistencia de la lógica de negocio.
 */
/**
 * @description Helper para construir cláusulas WHERE dinámicas y sus parámetros.
 * @param {Object} filters - Objeto con los filtros aplicados.
 * @returns {Object} Contiene { whereClause, params }
 */
const buildDynamicFilters = (filters) => {
    let whereClause = '';
    const params = [];

    if (filters.is_active !== undefined) {
        whereClause += ` AND p.is_active = ?`;
        params.push(Number(filters.is_active));
    }

    if (filters.category_id) {
        whereClause += ` AND p.category_id = ?`;
        params.push(Number(filters.category_id));
    }

    if (filters.search) {
        whereClause += ` AND (p.name LIKE ? OR p.code LIKE ?)`;
        const likeTerm = `%${filters.search}%`;
        params.push(likeTerm, likeTerm);
    }

    if (filters.name) {
        whereClause += ` AND p.name LIKE ?`;
        const likeName = `%${filters.name}%`;
        params.push(likeName);
    }

    return { whereClause, params };
};

export const ProductModel = { 

  /**
   * @description Realiza un conteo dinámico de registros aplicando filtros opcionales de búsqueda y estado.
   * @param {Object} [filters={}] - Objeto de filtrado (search, is_active, category_id).
   * @returns {Promise<number>} Cantidad total de registros que cumplen los criterios.
   */
  countDynamic: async (filters = {}) => {
      let query = `SELECT COUNT(p.id) as total FROM products p WHERE 1=1`;
      const { whereClause, params } = buildDynamicFilters(filters);
      query += whereClause;

      if (filters.name) {
          query += ` AND p.name LIKE ?`;
          const likeName = `%${filters.name}%`;
          params.push(likeName);
      }

      const [rows] = await pool.query(query, params);
      return rows[0].total;
  },

  /**
   * @description Motor de búsqueda y extracción principal mediante SQL dinámico y paginación.
   * @param {Object} [filters={}] - Configuración: search, is_active, category_id, sortBy, sortOrder, paginate, limit, offset.
   * @returns {Promise<Array>} Listado de productos con asociación de categoría.
   */
  findAllDynamic: async (filters = {}) => {
      let query = `
          SELECT 
              p.*, 
              p.is_active as isActive,
              c.name as category 
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE 1=1
      `;
      const { whereClause, params } = buildDynamicFilters(filters);
      query += whereClause;

      if (filters.name) {
          query += ` AND p.name LIKE ?`;
          const likeName = `%${filters.name}%`;
          params.push(likeName);
      }

      const allowedSortColumns = ['id', 'name', 'price', 'stock', 'code', 'created_at'];
      const sortBy = allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'name';
      const sortOrder = String(filters.sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      query += ` ORDER BY p.${sortBy} ${sortOrder}`;

      if (String(filters.paginate) !== 'false') {
          query += ` LIMIT ? OFFSET ?`;
          params.push(Number(filters.limit || 10), Number(filters.offset || 0));
      } else if (filters.limit) {
          query += ` LIMIT ?`;
          params.push(Number(filters.limit));
      }

      const [rows] = await pool.query(query, params);
      return rows;
  },

  /**
   * @description Recupera un producto específico por su ID con su categoría asociada.
   * @param {number|string} id - Identificador único del producto.
   * @returns {Promise<Object|undefined>} Objeto del producto encontrado.
   */
  findById: async (id) => {
    const [rows] = await pool.query(`
          SELECT 
              p.*, 
              c.name as category_name 
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ?
      `, [id]);
    return rows[0];
  },

  /**
   * @description Consulta productos pertenecientes a una categoría específica.
   * @param {number} categoryId - Identificador de la categoría.
   * @returns {Promise<Array>} Listado de productos filtrados por categoría.
   */
  findByCategoryId: async (categoryId) => {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE category_id = ?",
      [categoryId],
    );
    return rows;
  },

  /**
   * @description Persiste un nuevo producto en la base de datos y retorna la instancia creada.
   * @param {Object} newProduct - Datos del producto (code, name, category_id, price, stock).
   * @returns {Promise<Object>} El objeto producto recién insertado.
   */
  create: async (newProduct) => {
    const { code, name, category_id, price, stock } = newProduct;
    const [result] = await pool.query(
      "INSERT INTO products (code, name, category_id, price, stock) VALUES (?, ?, ?, ?, ?)",
      [code, name, category_id, price, stock]
    );
    
    const [createdProduct] = await pool.query(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );
    
    return createdProduct[0];
  },

  /**
   * @description Actualiza la información de un producto existente y su estado activo/inactivo.
   * @param {number} id - Identificador del producto a actualizar.
   * @param {Object} updatedFields - Campos actualizados.
   * @returns {Promise<Object|null>} El producto actualizado o null si no se encontró el ID.
   */
  update: async (id, updatedFields) => {
    const { code, name, category_id, price, stock } = updatedFields;
    const isActiveField = updatedFields.isActive !== undefined ? updatedFields.isActive : updatedFields.is_active;
    
    let query = "UPDATE products SET code = ?, name = ?, category_id = ?, price = ?, stock = ?";
    const params = [code, name, category_id, price, stock];

    if (isActiveField !== undefined) {
        query += ", is_active = ?";
        params.push(isActiveField ? 1 : 0);
    }
    query += " WHERE id = ?";
    params.push(id);

    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) return null;
    
    const [updatedProduct] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    return updatedProduct[0];
  },

  ///////////////////
  toggleStatus: async (id, isActive) => {
    const [result] = await pool.query(
        "UPDATE products SET is_active = ? WHERE id = ?",
        [isActive ? 1 : 0, id]
    );

    if (result.affectedRows === 0) return null;

    const [updatedProduct] = await pool.query(
        "SELECT *, is_active as isActive FROM products WHERE id = ?", [id]
    );
    return updatedProduct[0];
},

  /**
   * @description Ejecuta una eliminación permanente de un producto por ID.
   * @param {number} id - Identificador del producto.
   * @returns {Promise<boolean>} True si la eliminación fue exitosa, false de lo contrario.
   */
  delete: async (id) => {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  /**
   * @description Calcula métricas básicas de inventario (Total de productos y valorización total).
   * @returns {Promise<Object>} Objeto con totalProducts e inventoryValue.
   */
  getInventoryStats: async () => {
      const query = `
          SELECT 
              COUNT(id) as totalProducts, 
              SUM(price * stock) as inventoryValue 
          FROM products
          WHERE is_active = 1
      `;
      const [rows] = await pool.query(query);
      return rows[0]; 
  }, 

  /**
   * @description Identifica la cantidad de productos con stock crítico (menor o igual al umbral).
   * @param {number} threshold - Cantidad de unidades considerada crítica.
   * @returns {Promise<Object>} Cantidad de productos en stock crítico.
   */
  getCriticalStockCount: async (threshold) => {
    const query = `
        SELECT COUNT(id) as criticalStockCount 
        FROM products 
        WHERE stock <= ? AND is_active = 1
    `;
    const [rows] = await pool.query(query, [threshold]);
    return rows[0];
  },

  /**
   * @description Consulta un producto bajo el contexto de una transacción iniciada previamente.
   * @param {number} id - Identificador del producto.
   * @param {Object} connection - Instancia de conexión de la transacción MySQL.
   * @returns {Promise<Object>} Datos del producto para validación de stock.
   */
  findByIdForTransaction: async (id, connection) => {
      const query = 'SELECT id, name, price, stock FROM products WHERE id = ?';
      const [rows] = await connection.query(query, [id]);
      return rows[0];
  },

  /**
   * @description Realiza una actualización atómica de stock mediante un decremento directo.
   * @param {number} productId - ID del producto.
   * @param {number} quantity - Cantidad a descontar.
   * @param {Object} connection - Instancia de conexión de la transacción MySQL.
   * @returns {Promise<void>}
   */
  decrementStock: async (productId, quantity, connection) => {
      const query = `UPDATE products SET stock = stock - ? WHERE id = ?`;
      await connection.query(query, [quantity, productId]);
  }
};