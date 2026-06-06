import { UserModel } from "../models/user.model.js";

/**
 * @description Middleware de orden superior que intercepta la petición y ejecuta una política.
 * @param {Object} policy - El módulo de política a evaluar (ej. UserPolicy).
 * @param {String} action - El método específico dentro de la política (ej. 'delete').
 */
export const authorizePolicy = (policy, action) => {
    return async (req, res, next) => {
        try {
            const authUser = req.user; // Cargado previamente por el middleware de autenticación JWT
            const { id } = req.params; // ID del recurso enviado en la URL

            // 1. Validación de Precondición: El actor debe estar autenticado en el sistema
            if (!authUser) {
                const error = new Error("No autenticado. Falta el contexto del usuario.");
                error.statusCode = 401;
                return next(error);
            }

            // 2. Extracción del recurso: Buscamos el objetivo real en la base de datos
            const targetUser = await UserModel.findById(id);
            if (!targetUser) {
                const error = new Error(`El recurso Usuario con ID ${id} no fue encontrado.`);
                error.statusCode = 404;
                return next(error);
            }

            // 3. Evaluación de la Política: Pasamos los dos objetos en frío
            const isAuthorized = policy[action](authUser, targetUser);

            // 4. Bifurcación de acceso
            if (!isAuthorized) {
                const error = new Error("Acceso denegado: No eres el propietario del recurso ni posees los privilegios administrativos requeridos.");
                error.statusCode = 403; // Forbidden
                return next(error);
            }

            // PERLA DE OPTIMIZACIÓN PEDAGÓGICA:
            // Como ya buscamos al usuario objetivo en la base de datos para evaluar la política,
            // se lo inyectamos al objeto 'req'. Así, el controlador ya no tendrá que hacer 
            // un 'UserModel.findById(id)' extra. Ahorramos un viaje a la BD.
            req.targetUser = targetUser;

            next();
        } catch (error) {
            next(error); // Delegación directa al response handler de errores masivos
        }
    };
};