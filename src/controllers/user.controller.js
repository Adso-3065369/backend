import { UserService } from "../services/user.service.js";
import { successResponse } from "../utils/response.handler.js";
import { catchAsync } from "../utils/catchAsync.js";

/**
 * @file user.controller.js
 * @description Orquestador HTTP para el dominio de Usuarios y Control de Accesos (RBAC).
 * @quality_attributes
 * - Abstracción: Empaqueta los parámetros de la URL para el motor dinámico del servicio.
 */
export const UserController = {

    /**
     * @description Lista el directorio de usuarios inyectando parámetros de paginación y búsqueda.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} 
     */
    // Método controlador para obtener todos los usuarios con filtros y paginación
    getAll: catchAsync(async (req, res) => {
        // Creamos un objeto de filtros extrayendo los parámetros de la solicitud HTTP
        const filters = {
            // Término de búsqueda de texto (nombre o correo)
            search: req.query.search || null,
            // Nombre del rol para filtrar los usuarios correspondientes
            role: req.query.role || null,
            // Número de página actual para la paginación
            page: req.query.page,
            // Límite de elementos por página
            limit: req.query.limit,
            // Indicador para desactivar la paginación (si viene 'false')
            paginate: req.query.paginate,
            // Columna por la cual ordenar los resultados
            sortBy: req.query.sortBy,
            // Dirección del ordenamiento (ASC o DESC)
            sortOrder: req.query.sortOrder
        };

        // Invocamos al servicio de usuarios pasándole los filtros construidos
        const result = await UserService.getAllUsers(filters);
        
        // Retornamos una respuesta HTTP exitosa (código 200) con el resultado obtenido
        return successResponse(res, 200, "Lista de usuarios recuperada exitosamente.", result);
    }),

    /**
     * @description Consulta un usuario específico y sus dependencias de acceso.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware de propagación de errores.
     * @returns {Promise<void>}
     */
    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const user = await UserService.getUserById(id);

        if (!user) {
            const error = new Error(`El usuario con ID ${id} no existe en el sistema.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Información del usuario recuperada exitosamente.", user);
    }),

    /**
     * @description Orquesta la persistencia de un nuevo recurso de usuario.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>}
     */
    create: catchAsync(async (req, res) => {
        const newUser = await UserService.createUser(req.body);
        return successResponse(res, 201, "Usuario registrado exitosamente en el sistema.", newUser);
    }),

    /**
     * @description Coordina la mutación de los datos básicos de un usuario.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware de propagación de errores.
     * @returns {Promise<void>}
     */
    update: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const updatedUser = await UserService.updateUser(id, req.body);

        if (!updatedUser) {
            const error = new Error(`No se pudo actualizar. El usuario con ID ${id} no fue encontrado.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Datos de usuario actualizados exitosamente.", updatedUser);
    }),

    /**
     * @description Maneja la petición de borrado de un usuario.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @param {Function} next - Middleware de propagación de errores.
     * @returns {Promise<void>}
     */
    delete: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const isDeleted = await UserService.deleteUser(id);

        if (!isDeleted) {
            const error = new Error(`No se pudo eliminar. El usuario con ID ${id} no fue encontrado.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Usuario eliminado correctamente del sistema.", null);
    }),

    /**
     * @description Coordina la asignación transaccional de roles a un usuario.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>}
     */
    assignRoles: catchAsync(async (req, res) => {
        const userId = req.params.id;
        const { roleIds } = req.body;

        await UserService.assignRolesToUser(userId, roleIds);
        const updatedRolesAndPermissions = await UserService.getUserRolesAndPermissions(userId);
        
        return successResponse(res, 200, "Niveles de acceso actualizados correctamente.", {
            userId,
            roles: updatedRolesAndPermissions
        });
    })
};