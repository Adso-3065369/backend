import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string({
      required_error: "El nombre de la categoría es obligatorio",
      invalid_type_error: "El nombre debe ser una cadena de texto",
    })
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede exceder los 50 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder los 500 caracteres")
    .optional() // Permite que no venga en el body
    .nullable(), // Permite que sea null en BD
});