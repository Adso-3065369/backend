import pool from "../config/db.js";
import { UserModel } from "../models/user.model.js";

// Helper de transformación para la estructura de permisos (Mantenido por requerimiento del Frontend)
const formatRolesAndPermissions = (rawRows) => {
    const rolesMap = rawRows.reduce((acc, row) => {
        const { role_id, role_name, permission_code } = row;
        
        if (!acc[role_id]) {
            acc[role_id] = { id: role_id, name: role_name, permissions: [] };
        }
        
        acc[role_id].permissions.push(permission_code);
        return acc;
    }, {});

    return Object.values(rolesMap);
};

/**
 * @file user.service.js
 * @description Capa de negocio para la gestión transaccional y orquestación del RBAC.
 * @quality_attributes
 * - Limpieza: Los helpers iterativos de usuario fueron eliminados, delegando el parseo JSON a la base de datos.
 */
export const UserService = {
    
    // ============================================================================
    // CONSULTAS Y LECTURAS
    // ============================================================================

    /**
     * @description Coordina la extracción paginada o plana del directorio de usuarios.
     * @param {Object} filters - Diccionario de parámetros de control (Tratado como Inmutable).
     * @returns {Promise<Object|Array>} Estructura paginada o arreglo plano.
     */
    getAllUsers: async (filters = {}) => {
        // 1. Ruta plana: Pasamos el objeto original sin tocarlo
        if (String(filters.paginate) === 'false') {
            return await UserModel.findAllDynamic(filters);
        }

        // 2. Cálculos matemáticos aislados
        const limit = Number(filters.limit) || 10;
        const page = Number(filters.page) || 1;
        const offset = (page - 1) * limit;

        // 3. SOLUCIÓN ARQUITECTÓNICA: Clonación Defensiva
        // Creamos un NUEVO objeto que hereda los filtros originales (ej. search, role)
        // y le inyectamos/sobrescribimos las variables de paginación estrictas.
        const dbQueryParams = {
            ...filters, 
            limit,
            offset
        };

        // 4. Ejecución concurrente usando el nuevo objeto sanitizado
        const [totalItems, users] = await Promise.all([
            UserModel.countDynamic(dbQueryParams),
            UserModel.findAllDynamic(dbQueryParams)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        // 5. Retorno estructurado
        return {
            data: users,
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
     * @description Recupera la estructura profunda de un usuario, incluyendo métricas y matriz de roles.
     * @param {number|string} id - Identificador del usuario.
     * @returns {Promise<Object|null>} Objeto estructurado.
     */
    getUserById: async (id) => {
        return await UserModel.findById(id);
    },

    /**
     * @description Extrae la matriz unidimensional de códigos de permiso para el motor de UI.
     * @param {number|string} userId - Identificador.
     * @returns {Promise<Array<string>>}
     */
    getUserPermissions: async (userId) => {
        const rawRows = await UserModel.getRawUserPermissions(userId);
        return rawRows.map(row => row.code);
    },

    /**
     * @description Formatea las dependencias entre roles y permisos para el editor del frontend.
     * @param {number|string} userId - Identificador.
     * @returns {Promise<Array<Object>>}
     */
    getUserRolesAndPermissions: async (userId) => {
        const rawRows = await UserModel.getRawUserRolesAndPermissions(userId);
        return formatRolesAndPermissions(rawRows);
    },

    // ============================================================================
    // ESCRITURA Y MUTACIONES
    // ============================================================================

    /**
     * @description Persiste un nuevo usuario en la base de datos previa verificación de unicidad del email.
     * Esto evita que se introduzcan registros duplicados que causarían excepciones inesperadas del motor de BD.
     * 
     * @param {Object} userData - Estructura de datos del nuevo usuario.
     * @param {string} userData.name - Nombre completo del usuario.
     * @param {string} userData.email - Dirección de correo electrónico única.
     * @param {string} userData.password - Hash de contraseña.
     * @returns {Promise<Object>} Datos del usuario registrado y sanitizado.
     * @throws {Error} Si el correo electrónico ya existe registrado en el sistema (statusCode 400).
     */
    createUser: async (userData) => {
        // Guarda de unicidad: evita registrar un correo ya existente
        const existingUser = await UserModel.findByEmail(userData.email);
        if (existingUser) {
            const error = new Error("Error de validación en los datos enviados");
            error.statusCode = 400;
            error.errors = [{ field: "email", message: "Este correo ya se encuentra registrado en el sistema." }];
            throw error;
        }
        return await UserModel.create(userData);
    },

    /**
     * @description Actualiza los datos básicos de un usuario existente previa validación de unicidad del email.
     * La lógica permite que el usuario mantenga su correo actual sin lanzar error, pero bloquea la operación 
     * si intenta usar un correo que pertenezca a otra cuenta registrada.
     * 
     * @param {number|string} id - ID del usuario a modificar.
     * @param {Object} userData - Datos a actualizar.
     * @param {string} userData.name - Nombre actualizado.
     * @param {string} userData.email - Correo actualizado.
     * @returns {Promise<Object|null>} Datos del usuario modificado, o null si no se encuentra.
     * @throws {Error} Si el nuevo correo ya pertenece a otro usuario registrado (statusCode 400).
     */
    updateUser: async (id, userData) => {
        // Guarda de unicidad: permite que el usuario conserve su propio correo,
        // pero bloquea si el correo ya pertenece a OTRA cuenta distinta.
        const existingUser = await UserModel.findByEmail(userData.email);
        if (existingUser && String(existingUser.id) !== String(id)) {
            const error = new Error("Error de validación en los datos enviados");
            error.statusCode = 400;
            error.errors = [{ field: "email", message: "Este correo ya está en uso por otra cuenta del sistema." }];
            throw error;
        }
        return await UserModel.update(id, userData);
    },

    deleteUser: async (id) => {
        return await UserModel.delete(id);
    },

    // ============================================================================
    // FLUJO TRANSACCIONAL (ACID)
    // ============================================================================

    /**
     * @description Valida y ejecuta la asignación de roles mediante una transacción atómica.
     * @param {number|string} userId - ID objetivo.
     * @param {Array<number>} roleIds - Arreglo de IDs de roles a asignar.
     * @throws {Error} Si el usuario no existe o el payload de roles está vacío.
     */
    assignRolesToUser: async (userId, roleIds) => {
        const existingUser = await UserModel.findById(userId);
        if (!existingUser) {
            const error = new Error("El usuario especificado no existe.");
            error.statusCode = 404;
            throw error;
        }

        if (!Array.isArray(roleIds) || roleIds.length === 0) {
            const error = new Error("Debe asignar al menos un nivel de acceso al usuario.");
            error.statusCode = 400;
            throw error;
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            await UserModel.deleteUserRoles(userId, connection);

            const valuesMatrix = roleIds.map(roleId => [userId, roleId]);
            await UserModel.insertUserRolesBulk(valuesMatrix, connection);

            await connection.commit();

            return { 
                success: true, 
                message: "Niveles de acceso actualizados correctamente." 
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }    
};