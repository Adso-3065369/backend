import pool from "../config/db.js";

/**
 * @file user.model.js
 * @description Capa de acceso a datos para la entidad de Usuarios utilizando el patrón Dynamic Query Builder.
 * @quality_attributes
 * - Optimización de Memoria: Evita los productos cartesianos utilizando subconsultas escalares en lugar de múltiples JOINs directos.
 * - Inyección Relacional: Genera arreglos JSON directamente en el motor MySQL, anulando la necesidad de iteradores en Node.js.
 */
export const UserModel = {
  
  // ========================================================================
  // BÚSQUEDA DINÁMICA (Dynamic Query Builder)
  // ========================================================================

  /**
   * @description Realiza el conteo absoluto de la entidad evaluando restricciones de búsqueda.
   * @param {Object} [filters={}] - Parámetros de consulta dinámica.
   * @returns {Promise<number>}
   */
  // Cuenta la cantidad de usuarios aplicando los filtros provistos
  countDynamic: async (filters = {}) => {
      // Definimos la consulta base inicial para contar los registros de la tabla users
      let query = `SELECT COUNT(id) as total FROM users WHERE 1=1`;
      // Inicializamos un arreglo para guardar los parámetros que se inyectarán de forma segura en la consulta SQL
      const params = [];

      // Si existe un término de búsqueda para nombre o correo electrónico
      if (filters.search) {
          // Añadimos la cláusula LIKE para buscar coincidencias parciales de forma segura
          query += ` AND (name LIKE ? OR email LIKE ?)`;
          // Formateamos el término envolviéndolo en porcentajes para la coincidencia de subcadena
          const likeTerm = `%${filters.search}%`;
          // Agregamos dos veces el parámetro (uno para name y otro para email)
          params.push(likeTerm, likeTerm);
      }

      // Si existe un filtro por rol
      if (filters.role) {
          // Agregamos una subconsulta con EXISTS para validar de forma eficiente si el usuario posee dicho rol asignado
          query += ` AND EXISTS (
              SELECT 1 FROM user_roles ur2 
              INNER JOIN roles r2 ON ur2.role_id = r2.id 
              WHERE ur2.user_id = users.id AND r2.name = ?
          )`;
          // Agregamos el nombre del rol a los parámetros de la consulta
          params.push(filters.role);
      }

      // Ejecutamos la consulta en el pool de conexiones de base de datos
      const [rows] = await pool.query(query, params);
      // Retornamos el valor numérico absoluto correspondiente al conteo total
      return rows[0].total;
  },

  /**
   * @description Construye la matriz de usuarios inyectando su conteo histórico de ventas y la compilación JSON de sus roles.
   * @param {Object} [filters={}] - Parámetros de control de la tabla.
   * @returns {Promise<Array<Object>>} Colección de usuarios.
   */
  // Recupera todos los usuarios aplicando filtros, paginación y ordenamiento
  findAllDynamic: async (filters = {}) => {
      // Consulta SQL estructurada con subconsultas para evitar duplicación de filas y formatear roles a JSON array en base de datos
      let query = `
          SELECT 
              u.id, 
              u.name, 
              u.email, 
              u.created_at,
              (SELECT COUNT(id) FROM sales WHERE user_id = u.id) AS sales_count,
              (
                  SELECT COALESCE(
                      JSON_ARRAYAGG(JSON_OBJECT('id', r.id, 'name', r.name)),
                      JSON_ARRAY()
                  )
                  FROM user_roles ur
                  INNER JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = u.id
              ) AS roles
          FROM users u
          WHERE 1=1
      `;
      // Inicializamos un arreglo de parámetros para la inyección SQL segura
      const params = [];

      // Filtro de búsqueda por texto (nombre o correo)
      if (filters.search) {
          // Agregamos la restricción con LIKE para buscar coincidencias
          query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
          // Definimos el comodín del texto para la búsqueda
          const likeTerm = `%${filters.search}%`;
          // Registramos el parámetro para el nombre y el correo
          params.push(likeTerm, likeTerm);
      }

      // Filtro de búsqueda por rol
      if (filters.role) {
          // Buscamos que exista una relación en la tabla puente con un rol que tenga el nombre seleccionado
          query += ` AND EXISTS (
              SELECT 1 FROM user_roles ur2 
              INNER JOIN roles r2 ON ur2.role_id = r2.id 
              WHERE ur2.user_id = u.id AND r2.name = ?
          )`;
          // Registramos el parámetro del rol en el arreglo
          params.push(filters.role);
      }

      // Definición de columnas permitidas para el ordenamiento
      const allowedSortColumns = ['id', 'name', 'email', 'created_at', 'sales_count'];
      // Validamos que el criterio de ordenamiento pertenezca a la lista de columnas válidas (por defecto 'name')
      const sortBy = allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'name';
      // Validamos que la dirección de ordenamiento sea ASC o DESC (por defecto 'ASC')
      const sortOrder = String(filters.sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      // Concatenamos el ordenamiento seleccionado a la consulta SQL
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Si no se desactivó explícitamente la paginación
      if (String(filters.paginate) !== 'false') {
          // Agregamos los límites de corte (LIMIT y OFFSET) para recuperar un rango de datos específico
          query += ` LIMIT ? OFFSET ?`;
          // Inyectamos el límite de registros por página y el índice de inicio calculado
          params.push(Number(filters.limit || 10), Number(filters.offset || 0));
      } else if (filters.limit) {
          // Si solo se solicita un límite simple, se añade LIMIT a secas
          query += ` LIMIT ?`;
          // Registramos el valor numérico del límite
          params.push(Number(filters.limit));
      }

      // Ejecutamos la consulta dinámica completa en la base de datos MySQL
      const [rows] = await pool.query(query, params);
      // Retornamos el conjunto mapeado de usuarios devuelto por la base de datos
      return rows;
  },

/**
   * @description Extrae la identidad y configuración estructural completa de un usuario por su llave primaria.
   * @param {number|string} id - Identificador del usuario.
   * @returns {Promise<Object|undefined>} Objeto de usuario.
   */
  findById: async (id) => {
      const query = `
          SELECT 
              u.id, 
              u.name, 
              u.email, 
              u.refresh_token,
              u.created_at,
              (SELECT COUNT(id) FROM sales WHERE user_id = u.id) AS sales_count,
              (
                  SELECT COALESCE(
                      JSON_ARRAYAGG(JSON_OBJECT('id', r.id, 'name', r.name)),
                      JSON_ARRAY()
                  )
                  FROM user_roles ur
                  INNER JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = u.id
              ) AS roles
          FROM users u
          WHERE u.id = ?
      `;
      const [rows] = await pool.query(query, [id]);
      return rows[0];
  },

  // ========================================================================
  // LECTURAS Y ESCRITURAS ESTÁNDAR
  // ========================================================================

  /**
   * @description Consulta estructural para autenticación por correo electrónico.
   * @param {string} email - Correo del usuario.
   * @returns {Promise<Object|undefined>}
   */
  findByEmail: async (email) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  },

  /**
   * @description Persiste un registro de usuario.
   * @param {Object} newUser - Objeto validado con los datos.
   * @returns {Promise<Object>} Registro incrustado.
   */
  create: async (newUser) => {
    const { name, email, password } = newUser;
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password]
    );
    return await UserModel.findById(result.insertId);
  },

  /**
   * @description Sobrescribe los atributos de contacto y credenciales básicas.
   * @param {number|string} id - Llave primaria.
   * @param {Object} updatedFields - Objeto DTO.
   * @returns {Promise<Object|null>} El usuario actualizado o nulo.
   */
  update: async (id, updatedFields) => {
      const { name, email } = updatedFields;
      const [result] = await pool.query(
          "UPDATE users SET name = ?, email = ? WHERE id = ?",
          [name, email, id]
      );
      if (result.affectedRows === 0) return null;
      return await UserModel.findById(id);
  },

  /**
   * @description Inyecta un token de refresco JWT para mantenimiento de sesiones persistentes.
   * @param {number|string} id - Identificador.
   * @param {string} refreshToken - Hash JWT.
   * @returns {Promise<boolean>} Estado de la operación.
   */
  updateRefreshToken: async (id, refreshToken) => {
    const [result] = await pool.query(
      "UPDATE users SET refresh_token = ? WHERE id = ?",
      [refreshToken, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * @description Revoca el token de refresco destruyendo la validez de la sesión cruzada.
   * @param {number|string} id - Identificador.
   * @returns {Promise<boolean>}
   */
  clearRefreshToken: async (id) => {
    const [result] = await pool.query(
      "UPDATE users SET refresh_token = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * @description Ejecuta el borrado físico del registro (Hard Delete).
   * @param {number|string} id - Llave primaria.
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {
      const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
      return result.affectedRows > 0;
  },

  // ========================================================================
  // CONSULTAS RBAC PURAS
  // ========================================================================

  /**
   * @description Extrae la lista absoluta de códigos de permisos vinculados al usuario, sin jerarquía.
   * @param {number|string} userId - Llave primaria.
   * @returns {Promise<Array>} Lista matricial de permisos.
   */
  getRawUserPermissions: async (userId) => {
    const query = `
       SELECT DISTINCT p.code 
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = ?
    `;
    const [rows] = await pool.query(query, [userId]);
    return rows;
  },

  /**
   * @description Consolida la tabla puente de roles y permisos para el motor UI en el frontend.
   * @param {number|string} userId - Llave primaria.
   * @returns {Promise<Array>} Lista relacional cruda.
   */
  getRawUserRolesAndPermissions: async (userId) => {
    const query = `
       SELECT 
        r.id AS role_id, 
        r.name AS role_name, 
        p.code AS permission_code
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = ?
    `;
    const [rows] = await pool.query(query, [userId]);
    return rows;
  },

  // ========================================================================
  // MÓDULO DE TRANSACCIONES (Conexión Inyectada)
  // ========================================================================

  /**
   * @description Actualiza la contraseña hasheada del usuario.
   * @param {number|string} id - Identificador del usuario.
   * @param {string} hashedPassword - Nueva contraseña ya hasheada.
   * @returns {Promise<boolean>}
   */
  updatePassword: async (id, hashedPassword) => {
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * @description Purga el mapeo de roles en el contexto de una transacción atómica.
   * @param {number|string} userId - Identificador del usuario.
   * @param {Object} connection - Instancia del pool transaccional.
   */
  deleteUserRoles: async (userId, connection) => {

      await connection.query(
          "DELETE FROM user_roles WHERE user_id = ?", 
          [userId]
      );
  },

  /**
   * @description Ejecuta un Bulk Insert para los nuevos vectores de acceso.
   * @param {Array<Array>} valuesMatrix - Matriz de ID de usuario y rol.
   * @param {Object} connection - Instancia del pool transaccional.
   */
  insertUserRolesBulk: async (valuesMatrix, connection) => {
      await connection.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ?", 
          [valuesMatrix]
      );
  }
};