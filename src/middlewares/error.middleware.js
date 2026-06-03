import { errorResponse } from "../utils/response.handler.js";

export const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  // El mensaje principal (ej. "Error de validación en los datos enviados")
  const message = err.message || "Error interno del servidor";

  // Si el error trae su propio arreglo detallado de errores (como los de Zod), lo usamos.
  // Si no trae nada, simplemente metemos el mensaje principal en un arreglo.
  const detailedErrors = err.errors || [err.message];

  // Le pasamos todo a nuestro estandarizador de respuestas
  return errorResponse(res, statusCode, message, detailedErrors);
};
