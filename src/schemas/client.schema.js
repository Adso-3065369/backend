import { z } from "zod";

/**
 * @file client.schema.js
 * @description Contrato de validación estricta para la creación y actualización de clientes.
 */
export const clientSchema = z.object({
    document_number: z.string({
        required_error: "El número de documento es obligatorio.",
        invalid_type_error: "El documento debe ser enviado como texto."
    })
    .min(5, "El documento debe tener un mínimo de 5 caracteres.")
    .max(20, "El documento excede el límite de 20 caracteres permitidos.")
    .trim(),

    name: z.string({
        required_error: "El nombre del cliente es obligatorio.",
        invalid_type_error: "El nombre debe ser una cadena de texto."
    })
    .min(3, "El nombre debe contener al menos 3 caracteres.")
    .max(100, "El nombre excede el límite de 100 caracteres.")
    .trim(),

    email: z.string({
        required_error: "El correo electrónico es obligatorio.",
        invalid_type_error: "El correo debe ser una cadena de texto."
    })
    .email("El formato del correo electrónico no es válido.")
    .max(150, "El correo excede la longitud máxima permitida en la base de datos.")
    .trim()
    .toLowerCase(),

    phone: z.string({
        required_error: "El número de teléfono es obligatorio.",
        invalid_type_error: "El teléfono debe ser enviado como texto."
    })
    .min(7, "El teléfono debe contener al menos 7 caracteres.")
    .max(20, "El teléfono excede la longitud máxima permitida.")
    .regex(/^[0-9+\-\s]+$/, "El número de teléfono contiene caracteres no permitidos (solo números, +, - y espacios).")
    .trim()
});