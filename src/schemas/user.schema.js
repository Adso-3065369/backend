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

/**
 * Esquema para la creación de un usuario desde el panel de administración.
 */
export const createUserSchema = z.object({
    name: z.string({
        required_error: "El nombre es obligatorio",
        invalid_type_error: "El nombre debe ser un texto válido"
    }).min(3, "El nombre debe tener al menos 3 caracteres"),

    email: z.string({
        required_error: "El correo electrónico es obligatorio",
        invalid_type_error: "El correo electrónico debe ser un texto"
    }).email("Debe ser un correo electrónico válido"),

    password: z.string({
        required_error: "La contraseña es obligatoria",
        invalid_type_error: "La contraseña debe ser un texto"
    }).min(6, "La contraseña debe tener al menos 6 caracteres")
}).strict("No se permiten propiedades adicionales en la petición");

/**
 * Esquema para la actualización de datos básicos de un usuario.
 * No incluye contraseña (flujo separado).
 */
export const updateUserSchema = z.object({
    name: z.string({
        required_error: "El nombre es obligatorio",
        invalid_type_error: "El nombre debe ser un texto válido"
    }).min(3, "El nombre debe tener al menos 3 caracteres"),

    email: z.string({
        required_error: "El correo electrónico es obligatorio",
        invalid_type_error: "El correo electrónico debe ser un texto"
    }).email("Debe ser un correo electrónico válido")
}).strict("No se permiten propiedades adicionales en la petición");