import { ConfigModel } from "../models/config.model.js";

/**
 * @file config.service.js
 * @description Capa de negocio para la gestión de la configuración del negocio.
 */
export const ConfigService = {

    /**
     * @description Recupera la configuración global del negocio.
     * @param {number} id - Identificador (siempre 1).
     * @returns {Promise<Object>} Configuración o valores por defecto.
     */
    getConfig: async (id) => {
        const config = await ConfigModel.findById(Number(id));
        if (!config) {
            // Retorna valores por defecto si aún no existe el registro
            return { id: 1, businessName: '', nit: '', taxRate: 19, updatedAt: null };
        }
        return config;
    },

    /**
     * @description Persiste (crea o actualiza) la configuración del negocio.
     * @param {number} id - Identificador del registro.
     * @param {Object} data - Campos: businessName, nit, taxRate.
     * @returns {Promise<Object>} Configuración actualizada.
     */
    saveConfig: async (id, data) => {
        return await ConfigModel.upsert(Number(id), data);
    }
};
