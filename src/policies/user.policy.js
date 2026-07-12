/**
 * @file user.policy.js
 * @description Diccionario de reglas de autorización orientadas al recurso Usuario.
 */
export const UserPolicy = {
    /**
     * @description Regla para verificar si el actor puede eliminar al sujeto.
     * @param {Object} authUser - El usuario que tiene la sesión iniciada (del token).
     * @param {Object} targetUser - El usuario que se intenta eliminar (de la BD).
     * @returns {Boolean}
     */
    delete: (authUser, targetUser) => {
        // Condición 1: El recurso le pertenece al mismo que intenta realizar la acción (Propiedad)
        const isOwner = String(authUser.id) === String(targetUser.id);
        if (isOwner) return true;

        // Condición 2: El actor posee el permiso explícito en su colección de privilegios (Rol/Permiso)
        const hasPermission = authUser.permissions.includes("users.delete");
        if (hasPermission) return true;

        // Si no cumple ninguna, la acción queda denegada
        return false;
    }
};