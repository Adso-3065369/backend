import pool from "../config/db.js";

/**
 * @file sale.model.js
 * @description Capa de acceso a datos para las transacciones de ventas.
 * @quality_attributes
 * - Mantenibilidad: Implementa el patrón Dynamic Query Builder para búsquedas consolidadas.
 * - Performance: Utiliza JSON_OBJECT y JSON_ARRAYAGG de MySQL para procesar relaciones complejas directamente en el motor de base de datos.
 * - Atomicidad: Métodos de escritura adaptados para recibir el objeto de conexión de la transacción.
 */
export const SaleModel = {
    // ========================================================================
    // MÓDULO DE TRANSACCIONES 
    // ========================================================================
    
    /**
     * @description Inserta la cabecera de la factura en el contexto de una transacción de base de datos.
     * @param {number} client_id - Identificador único del cliente vinculado a la venta.
     * @param {number} user_id - Identificador del usuario (cajero) que procesa la transacción.
     * @param {number} total - Valor total monetario calculado de la venta.
     * @param {Object} connection - Objeto de conexión activa para garantizar la integridad de la transacción MySQL.
     * @returns {Promise<number>} El ID autoincremental (insertId) generado para la cabecera de la venta.
     */
    createHeader: async (client_id, user_id, total, connection) => {        
        const [saleResult] = await connection.query(
            "INSERT INTO sales (client_id, user_id, total) VALUES (?, ?, ?)",
            [client_id, user_id, total]
        );
        return saleResult.insertId;
    },

    /**
     * @description Ejecuta una inserción masiva (Bulk Insert) de productos facturados para reducir latencia de red e I/O.
     * @param {Array<Array>} detailsMatrix - Matriz bidimensional con los detalles estructurados estrictamente como [[sale_id, product_id, name, price, qty, subtotal]].
     * @param {Object} connection - Objeto de conexión activa en el pool transaccional.
     * @returns {Promise<void>} Promesa resolutoria al completar la escritura en disco.
     */
    createDetailsBulk: async (detailsMatrix, connection) => {
        await connection.query(
            `INSERT INTO sale_details 
            (sale_id, product_id, product_name, unit_price, quantity, subtotal) 
            VALUES ?`,
            [detailsMatrix]
        );
    },

    // ========================================================================
    // MÓDULO DE BÚSQUEDA DINÁMICA (Dynamic Query Builder)
    // ========================================================================

    /**
     * @description Realiza un conteo dinámico de ventas, evaluando condiciones de búsqueda aplicadas a tablas relacionales.
     * @param {Object} [filters={}] - Diccionario de parámetros de filtrado (soporta 'search' para id de venta, nombre de cliente, vendedor o documento, y 'date' para fecha exacta).
     * @returns {Promise<number>} Cantidad absoluta de registros que coinciden con la heurística de búsqueda.
     */
    countDynamic: async (filters = {}) => {
        let query = `
            SELECT COUNT(s.id) as total 
            FROM sales s
            INNER JOIN clients c ON s.client_id = c.id
            INNER JOIN users u ON s.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // 1. Filtro Global (Código, Cliente, Vendedor, Documento)
        if (filters.search) {
            query += ` AND (c.name LIKE ? OR c.document_number LIKE ? OR u.name LIKE ? OR s.id = ?)`;
            const likeTerm = `%${filters.search}%`;
            // Pasamos el término 3 veces para los LIKE (cliente, documento, vendedor) y la coincidencia exacta (id)
            params.push(likeTerm, likeTerm, likeTerm, filters.search);
        }

        // 2. Filtro de Fecha Exacta
        if (filters.date) {
            query += ` AND DATE(s.created_at) = DATE(?)`;
            params.push(filters.date);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].total;
    },

    /**
     * @description Extrae el listado de ventas inyectando cláusulas dinámicas de paginación, ordenamiento y filtrado.
     * Construye objetos JSON nativos para las entidades Client y User directamente desde SQL.
     * @param {Object} [filters={}] - Parámetros de control: search, date, limit, offset, sortBy, sortOrder, paginate.
     * @returns {Promise<Array<Object>>} Colección de objetos de venta con metadatos relacionales incrustados.
     */
    findAllDynamic: async (filters = {}) => {
        let query = `
            SELECT 
                s.id, s.total, s.created_at,
                JSON_OBJECT('id', c.id, 'name', c.name, 'document_number', c.document_number) AS client,
                JSON_OBJECT('id', u.id, 'name', u.name) AS user
            FROM sales s
            INNER JOIN clients c ON s.client_id = c.id
            INNER JOIN users u ON s.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // 1. Filtro Global (Código, Cliente, Vendedor, )
        if (filters.search) {
            query += ` AND (c.name LIKE ? OR u.name LIKE ? OR s.id = ?)`;
            const likeTerm = `%${filters.search}%`;
            // 3 LIKES y 1 EXACT MATCH (Igual que en el countDynamic)
            params.push(likeTerm, likeTerm, filters.search);
        }

        // 2. Filtro de Fecha Exacta
        if (filters.date) {
            query += ` AND DATE(s.created_at) = DATE(?)`;
            params.push(filters.date);
        }

        const allowedSortColumns = ['id', 'total', 'created_at'];
        const sortBy = allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'created_at';
        const sortOrder = String(filters.sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY s.${sortBy} ${sortOrder}`;

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
     * @description Realiza una extracción profunda de una venta por su llave primaria, aglomerando todos los detalles facturados mediante JSON_ARRAYAGG.
     * @param {number|string} id - Llave primaria de la venta a consultar.
     * @returns {Promise<Object|null>} El registro consolidado de la venta (incluye array de productos) o null si la llave no existe.
     */
    findById: async (id) => {
        const query = `
            SELECT 
                s.id, s.total, s.created_at,
                JSON_OBJECT('id', c.id, 'name', c.name, 'document_number', c.document_number) AS client,
                JSON_OBJECT('id', u.id, 'name', u.name) AS user,
                COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', sd.id, 'product_id', sd.product_id, 'product_name', sd.product_name,
                            'unit_price', sd.unit_price, 'quantity', sd.quantity, 'subtotal', sd.subtotal
                        )
                    ), 
                    JSON_ARRAY()
                ) AS details
            FROM sales s
            INNER JOIN clients c ON s.client_id = c.id
            INNER JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_details sd ON s.id = sd.sale_id
            WHERE s.id = ?
            GROUP BY s.id, s.total, s.created_at, c.id, c.name, c.document_number, u.id, u.name
        `;
        const [rows] = await pool.query(query, [id]);
        return rows.length > 0 ? rows[0] : null; 
    },

    // ========================================================================
    // MÓDULO DE MÉTRICAS (Dashboards)
    // ========================================================================

    /**
     * @description Calcula los Indicadores Clave de Rendimiento (KPIs) absolutos del módulo transaccional.
     * @returns {Promise<Object>} Diccionario contentivo de 'totalSalesCount' (volumen) y 'totalSalesRevenue' (ingresos brutos).
     */
    getSalesStats: async () => {
        const query = `SELECT COUNT(id) as totalSalesCount, SUM(total) as totalSalesRevenue FROM sales`;
        const [rows] = await pool.query(query);
        return rows[0]; 
    },

    /**
     * @description Extrae la sumatoria de ingresos consolidados por mes cronológico, aplicable exclusivamente al año en curso.
     * @returns {Promise<Array<Object>>} Colección de objetos cartesianos { month, revenue }.
     */
    getSalesPerMonth: async () => {
        const query = `
            SELECT MONTH(created_at) as month, SUM(total) as revenue 
            FROM sales 
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(created_at)
            ORDER BY month ASC
        `;
        const [rows] = await pool.query(query);
        return rows;
    },

    /**
     * @description Determina las áreas de mayor volumen de salida calculando el top de categorías.
     * @param {number} [limit=5] - Cantidad máxima de categorías a retornar.
     * @returns {Promise<Array<Object>>} Arreglo descendente (category_name, sales_count).
     */
    getTopCategories: async (limit = 5) => {
        const query = `
            SELECT c.name as category_name, SUM(sd.quantity) as sales_count 
            FROM sale_details sd
            JOIN products p ON sd.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY sales_count DESC
            LIMIT ?
        `;
        // Inyecta el límite dinámicamente evitando inyección SQL
        const [rows] = await pool.query(query, [Number(limit)]);
        return rows;
    }
};