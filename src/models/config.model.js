import pool from "../config/db.js";

/**
 * @file config.model.js
 * @description Capa de acceso a datos para la configuración del negocio.
 * @quality_attributes
 * - Singleton lógico: La tabla almacena un único registro de configuración (id = 1).
 * - Upsert Pattern: Si no existe el registro, lo crea; si existe, lo actualiza.
 */
export const ConfigModel = {

    /**
     * @description Obtiene la configuración actual del negocio por su ID.
     * @param {number} id - Identificador (siempre 1 para la configuración global).
     * @returns {Promise<Object|undefined>} Registro de configuración o undefined.
     */
    findById: async (id) => {
        const [rows] = await pool.query(
            "SELECT id, business_name AS businessName, nit, tax_rate AS taxRate, updated_at AS updatedAt FROM configurations WHERE id = ?",
            [id]
        );
        return rows.length > 0 ? rows[0] : undefined;
    },

    /**
     * @description Actualiza la configuración existente o la crea si no existe (UPSERT).
     * @param {number} id - Identificador del registro.
     * @param {Object} data - Campos a actualizar: businessName, nit, taxRate.
     * @returns {Promise<Object>} Registro actualizado.
     */
    upsert: async (id, data) => {
        const { businessName, nit, taxRate } = data;

        await pool.query(
            `INSERT INTO configurations (id, business_name, nit, tax_rate, updated_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                business_name = VALUES(business_name),
                nit = VALUES(nit),
                tax_rate = VALUES(tax_rate),
                updated_at = NOW()`,
            [id, businessName, nit, taxRate]
        );

        return await ConfigModel.findById(id);
    }
};
