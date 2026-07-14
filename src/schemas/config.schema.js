import { z } from "zod";

export const configSchema = z.object({
    businessName: z
        .string({
            required_error: "El nombre del negocio es obligatorio.",
            invalid_type_error: "El nombre del negocio debe ser texto.",
        })
        .min(3, "El nombre del negocio debe tener al menos 3 caracteres.")
        .max(150, "El nombre del negocio no puede exceder los 150 caracteres."),

    nit: z
        .string({
            required_error: "El NIT es obligatorio.",
            invalid_type_error: "El NIT debe ser texto.",
        })
        .min(5, "El NIT debe tener al menos 5 caracteres.")
        .max(20, "El NIT no puede exceder los 20 caracteres."),

    taxRate: z
        .number({
            required_error: "El porcentaje de IVA es obligatorio.",
            invalid_type_error: "El IVA debe ser un número.",
        })
        .min(0, "El IVA no puede ser negativo.")
        .max(100, "El IVA no puede superar el 100%."),
});
