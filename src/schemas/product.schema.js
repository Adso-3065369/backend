import { z } from "zod";

export const productSchema = z
  .object({
    code: z
      .string({
        required_error: "El código (SKU) es obligatorio",
        invalid_type_error: "El código debe ser una cadena de texto",
      })
      .min(3, "El código debe tener al menos 3 caracteres")
      .regex(
        /^[a-zA-Z0-9\-]+$/,
        "El código solo puede contener letras, números y guiones (sin espacios)"
      ),

    name: z
      .string({
        required_error: "El nombre es obligatorio",
        invalid_type_error: "El nombre debe ser un texto válido",
      })
      .min(3, "El nombre debe tener al menos 3 caracteres"),

    category_id: z
      .number({
        required_error: "El ID de la categoría es obligatorio",
        invalid_type_error: "El ID de la categoría debe ser un número (no texto ni vacío)",
      })
      .int("El ID de la categoría debe ser un número entero")
      .positive("El ID de la categoría debe ser un número positivo"),

    price: z
      .number({
        required_error: "El precio es obligatorio",
        invalid_type_error: "El precio debe ser un número válido",
      })
      .nonnegative("El precio no puede ser negativo"),

    stock: z
      .number({
        required_error: "El stock inicial es obligatorio",
        invalid_type_error: "El stock debe ser un número válido",
      })
      .int("El stock debe ser un número entero (sin decimales)")
      .nonnegative("El stock no puede ser negativo"),

      isActive: z
      .boolean({
        invalid_type_error: "El estado debe ser verdadero o falso",
      })
      .optional(),
  })
  .strict("No envíes campos adicionales que no pertenecen al producto");