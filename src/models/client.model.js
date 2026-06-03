import pool from "../config/db.js";

/**
 * @file client.model.js
 * @description Capa de acceso a datos para la entidad Clientes utilizando Dynamic Query Builder.
 * @quality_attributes
 * - Mantenibilidad: Soporta filtros dinámicos (1=1).
 * - Rendimiento & Analítica: Inyecta agregaciones relacionales (COUNT) en tiempo real para determinar el volumen de compras del cliente directamente desde el motor SQL.
 */
export const ClientModel = {
    
    /**
     * @description Ejecuta un conteo absoluto de clientes basado en los filtros de búsqueda.
     * @param {Object} [filters={}] - Filtros opcionales (search).
     * @returns {Promise<number>} Total de registros coincidentes.
     */
    countDynamic: async (filters = {}) => {
        let query = `SELECT COUNT(id) as total FROM clients WHERE 1=1`;
        const params = [];

        if (filters.search) {
            query += ` AND (name LIKE ? OR document_number LIKE ?)`;
            const likeTerm = `%${filters.search}%`; 
            params.push(likeTerm, likeTerm);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].total;
    },

    /**
     * @description Motor de búsqueda que recupera clientes inyectando un conteo transaccional de ventas asociadas.
     * @param {Object} [filters={}] - Parámetros de configuración: search, limit, offset, sortBy, sortOrder.
     * @returns {Promise<Array>} Listado de clientes enriquecido con 'sales_count'.
     */
    findAllDynamic: async (filters = {}) => {
        // Inyección relacional: Agrupamos por cliente y contamos sus facturas.
        let query = `
            SELECT 
                c.id, 
                c.name, 
                c.document_number, 
                c.email, 
                c.phone,
                c.created_at,
                COUNT(s.id) AS sales_count
            FROM clients c
            LEFT JOIN sales s ON c.id = s.client_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            query += ` AND (c.name LIKE ? OR c.document_number LIKE ?)`;
            const likeTerm = `%${filters.search}%`; 
            params.push(likeTerm, likeTerm);
        }

        // Es vital el GROUP BY por la función de agregación COUNT
        query += ` GROUP BY c.id, c.name, c.document_number, c.email, c.phone, c.created_at`;

        // Reglas de ordenamiento seguras
        const allowedSortColumns = ['id', 'name', 'created_at', 'sales_count'];
        const sortBy = allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'name';
        const sortOrder = String(filters.sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Paginación
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
     * @description Recupera un cliente específico por ID, incluyendo su estadística histórica de compras.
     * @param {number|string} id - Llave primaria.
     * @returns {Promise<Object|undefined>} Registro del cliente o undefined.
     */
    findById: async (id) => {
        const query = `
            SELECT 
                c.*,
                COUNT(s.id) AS sales_count
            FROM clients c
            LEFT JOIN sales s ON c.id = s.client_id
            WHERE c.id = ?
            GROUP BY c.id
        `;
        const [rows] = await pool.query(query, [id]);
        return rows[0];
    },

    /**
     * @description Verifica la existencia de un cliente mediante su número de identificación fiscal/documento.
     * @param {string} documentNumber - Número de documento.
     * @returns {Promise<Object|undefined>} Registro del cliente.
     */
    findByDocument: async (documentNumber) => {
        const [rows] = await pool.query("SELECT * FROM clients WHERE document_number = ?", [documentNumber]);
        return rows[0];
    },    

    /**
     * @description Persiste un nuevo cliente en el directorio base.
     * @param {Object} clientData - DTO con datos validados (document_number, name, email, phone).
     * @returns {Promise<number>} ID autogenerado del nuevo registro.
     */
    create: async (clientData) => {
        const { document_number, name, email, phone } = clientData;
        const [result] = await pool.query(
            "INSERT INTO clients (document_number, name, email, phone) VALUES (?, ?, ?, ?)",
            [document_number, name, email, phone]
        );
        return result.insertId;
    },

    /**
     * @description Actualiza los datos de contacto y facturación de un cliente.
     * @param {number|string} id - Llave primaria.
     * @param {Object} clientData - DTO con datos a modificar.
     * @returns {Promise<number>} Cantidad de filas afectadas.
     */
    update: async (id, clientData) => {
        const { document_number, name, email, phone } = clientData;
        const [result] = await pool.query(
            "UPDATE clients SET document_number = ?, name = ?, email = ?, phone = ? WHERE id = ?",
            [document_number, name, email, phone, id]
        );
        return result.affectedRows;
    },    

    /**
     * @description Ejecuta el borrado duro (Hard Delete) del registro de un cliente.
     * @param {number|string} id - Llave primaria.
     * @returns {Promise<number>} Cantidad de filas afectadas.
     */
    delete: async (id) => {
        const [result] = await pool.query("DELETE FROM clients WHERE id = ?", [id]);
        return result.affectedRows;
    }
};