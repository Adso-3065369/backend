import pool from "../config/db.js";

/**
 * @file category.model.js
 * @description Capa de acceso a datos para el catálogo de categorías.
 * @quality_attributes
 * - Mantenibilidad: Absorbe los filtros a través de un Dynamic Query Builder.
 * - Performance: Utiliza agrupaciones (GROUP BY) y sentencias de agregación condicional (IF) a nivel de motor de base de datos para determinar relaciones existenciales, evitando bucles iterativos en el backend.
 */
export const CategoryModel = {
    
    /**
     * @description Calcula el total de categorías aplicando filtros estáticos de búsqueda.
     * @param {Object} [filters={}] - Diccionario de parámetros.
     * @returns {Promise<number>} Cantidad de categorías.
     */
    countDynamic: async (filters = {}) => {
        let query = `SELECT COUNT(id) as total FROM categories WHERE 1=1`;
        const params = [];

        if (filters.search) {
            query += ` AND name LIKE ?`;
            params.push(`%${filters.search}%`);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].total;
    },

    /**
     * @description Extrae el listado de categorías, anexando metadatos relacionales sobre productos asociados.
     * @param {Object} [filters={}] - Configuración de paginación y búsqueda.
     * @returns {Promise<Array<Object>>} Colección de categorías con variables derivadas (product_count, has_products).
     */
    findAllDynamic: async (filters = {}) => {
        let query = `
            SELECT 
                c.id, 
                c.name,
                c.description,
                COUNT(p.id) as product_count,
                IF(COUNT(p.id) > 0, true, false) as has_products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            query += ` AND c.name LIKE ?`;
            params.push(`%${filters.search}%`);
        }

        query += ` GROUP BY c.id, c.name, c.description`;

        const allowedSortColumns = ['id', 'name', 'product_count'];
        const sortBy = allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'name';
        const sortOrder = String(filters.sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (String(filters.paginate) !== 'false') {
            query += ` LIMIT ? OFFSET ?`;
            params.push(Number(filters.limit || 10), Number(filters.offset || 0));
        } else if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(Number(filters.limit));
        }

        const [rows] = await pool.query(query, params);
        
        // MySQL devuelve booleanos como 1 o 0 (TinyInt). Los forzamos a Boolean real de JS para la respuesta HTTP.
        return rows.map(row => ({
            ...row,
            has_products: Boolean(row.has_products)
        }));
    },

    /**
     * @description Consulta una categoría estricta por ID anexando contadores de dependencia relacional.
     * @param {number} id - Identificador de la categoría.
     * @returns {Promise<Object|undefined>} Objeto categoría enriquecido.
     */
    findById: async (id) => {
        const query = `
            SELECT 
                c.id, 
                c.name,
                c.description,
                COUNT(p.id) as product_count,
                IF(COUNT(p.id) > 0, true, false) as has_products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.description
        `;
        const [rows] = await pool.query(query, [id]);
        
        if (rows.length > 0) {
            rows[0].has_products = Boolean(rows[0].has_products);
            return rows[0];
        }
        return undefined;
    },

    /**
     * @description Escribe una nueva categoría en disco.
     * @param {Object} newCategory - Contrato de datos para la entidad.
     * @returns {Promise<Object>} Registro persistido.
     */
    create: async (newCategory) => {
        const { name, description } = newCategory;
        const [result] = await pool.query(
            "INSERT INTO categories (name, description) VALUES (?, ?)",
            [name, description]
        );

        // Reutilizamos findById para estandarizar la salida (incluirá product_count en 0)
        return await CategoryModel.findById(result.insertId);
    },

    /**
     * @description Sobrescribe los atributos mutables de una categoría específica.
     * @param {number} id - Llave primaria.
     * @param {Object} updatedFields - Mapa de campos a actualizar.
     * @returns {Promise<Object|null>} Registro actualizado o null en fallo.
     */
    update: async (id, updatedFields) => {
        const { name, description } = updatedFields;
        const [result] = await pool.query(
            "UPDATE categories SET name = ?, description = ? WHERE id = ?",
            [name, description, id]
        );

        if (result.affectedRows === 0) return null;

        return await CategoryModel.findById(id);
    },

    /**
     * @description Purga el registro de base de datos correspondiente a una categoría.
     * Intercepta violaciones de integridad referencial para emitir errores de negocio.
     * @param {number} id - Llave primaria.
     * @returns {Promise<boolean>} Estado de la transacción.
     */
    delete: async (id) => {
        try {
            const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [id]);
            return result.affectedRows > 0;
        } catch (error) {
            // Evalúa si el fallo es por una restricción de llave foránea (FK)
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                const businessError = new Error("No es posible eliminar la categoría porque tiene productos vinculados.");
                businessError.statusCode = 409; // 409 Conflict
                businessError.isOperational = true; // Marca para el manejador global de errores
                throw businessError;
            }
            
            // Si el error es de otra naturaleza (ej. desconexión del pool), relanza sin alterar
            throw error;
        }
    }
};