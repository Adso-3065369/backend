import { z } from "zod";

// Regex de contraseña fuerte: mínimo 8 chars, 1 mayúscula, 1 minúscula, 1 número
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const strongPasswordMessage = "La contraseña debe contener al menos una mayúscula (A-Z), una minúscula (a-z) y un número (0-9).";

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
  })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(strongPasswordRegex, strongPasswordMessage)

}).strict({
  message: "No envíes campos adicionales que no pertenecen al registro"
});

export const loginSchema = z.object({
  email: z.string({
    required_error: "El correo electrónico es obligatorio"
  }).email("Debe ser un correo electrónico válido"),

  password: z.string({
    required_error: "La contraseña es obligatoria"
  }).min(8, "La contraseña debe tener al menos 8 caracteres")
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

// Molde para restablecer la contraseña
export const resetPasswordSchema = z.object({
  token: z.string({ required_error: "El token es obligatorio" }),
  password: z.string({
    required_error: "La contraseña es obligatoria"
  })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(strongPasswordRegex, strongPasswordMessage)
}).strict();