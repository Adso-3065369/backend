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
    // Método para obtener todos los usuarios de la base de datos aplicando filtros y paginación
    getAll: catchAsync(async (req, res) => {
        // Se define un objeto con los diferentes criterios de filtrado enviados en la petición HTTP
        const filters = {
            // Término de búsqueda de texto para buscar por nombre o correo electrónico
            search: req.query.search || null,
            // Nombre del rol para filtrar los usuarios que tienen asignado dicho nivel de acceso
            role: req.query.role || null,
            // Número de página solicitado para la visualización de datos
            page: req.query.page,
            // Cantidad máxima de registros que se mostrarán en cada página
            limit: req.query.limit,
            // Parámetro booleano para indicar si queremos activar o desactivar la paginación
            paginate: req.query.paginate,
            // Columna específica por la cual queremos ordenar el listado obtenido
            sortBy: req.query.sortBy,
            // Dirección en la cual queremos ordenar los registros (ASC o DESC)
            sortOrder: req.query.sortOrder
        };

        // Llama a la capa de servicios de usuarios pasando el objeto de filtros estructurado
        const result = await UserService.getAllUsers(filters);
        
        // Envía una respuesta HTTP de éxito (código 200) con los datos recuperados
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