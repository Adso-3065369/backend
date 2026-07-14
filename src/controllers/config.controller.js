import { ConfigService } from "../services/config.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { successResponse } from "../utils/response.handler.js";

/**
 * @file config.controller.js
 * @description Controlador estandarizado para el dominio de Configuración del Negocio.
 * @quality_attributes
 * - SRP: Solo maneja el ciclo de vida HTTP (recibe, extrae, responde).
 */
export const ConfigController = {

    /**
     * @route GET /api/config/:id
     * @description Devuelve la configuración actual del negocio.
     */
    getById: catchAsync(async (req, res) => {
        const { id } = req.params;
        const config = await ConfigService.getConfig(id);
        return successResponse(res, 200, "Configuración recuperada exitosamente.", config);
    }),

    /**
     * @route PUT /api/config/:id
     * @description Crea o actualiza la configuración del negocio.
     */
    update: catchAsync(async (req, res) => {
        const { id } = req.params;
        const updatedConfig = await ConfigService.saveConfig(id, req.body);
        return successResponse(res, 200, "Configuración actualizada correctamente.", updatedConfig);
    })
};
