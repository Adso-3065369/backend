import { z } from "zod";

// Molde estricto para el registro de un nuevo usuario
export const registerSchema = z.object({
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

}).strict({
  message: "No envíes campos adicionales que no pertenecen al registro"
});

export const loginSchema = z.object({
  email: z.string({
    required_error: "El correo electrónico es obligatorio"
  }).email("Debe ser un correo electrónico válido"),

  password: z.string({
    required_error: "La contraseña es obligatoria"
  }).min(6, "La contraseña debe tener al menos 6 caracteres")
}).strict({
  message: "No envíes campos adicionales al iniciar sesión"
});

// Molde para la petición de renovar el token
export const refreshTokenSchema = z.object({
  refreshToken: z.string({
    required_error: "El token de refresco es obligatorio",
    invalid_type_error: "El formato del token de refresco no es válido"
  })
}).strict({
  message: "No envíes campos adicionales al renovar el token"
});