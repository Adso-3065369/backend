import { z } from "zod";

/**
 * Esquema estricto para la asignación de roles a un usuario.
 */
export const assignRolesSchema = z.object({
    roleIds: z.array(
        z.number({
            required_error: "El ID del rol es obligatorio",
            invalid_type_error: "El ID del rol debe ser numérico"
        }).int("Los IDs deben ser números enteros")
          .positive("Los IDs deben ser números positivos")
    ).min(1, "Debe seleccionar al menos un nivel de acceso para el usuario")
}).strict("No se permiten propiedades adicionales en la petición");