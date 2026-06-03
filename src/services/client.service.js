import { ClientModel } from "../models/client.model.js";

/**
 * @file client.service.js
 * @description Capa de negocio para la gestión de la cartera de clientes.
 * @quality_attributes
 * - Orquestación Dinámica: Implementa el switch de paginación universal.
 * - Validación Semántica: Protege la base de datos contra duplicados de documentos de identidad.
 */
export const ClientService = {

    /**
     * @description Evalúa los filtros solicitados y orquesta la consulta dinámica al directorio de clientes.
     * @param {Object} filters - Diccionario de parámetros (search, limit, page, paginate).
     * @returns {Promise<Object|Array>} Estructura paginada o arreglo plano.
     */
    getClientsList: async (filters) => {
        // 1. Modo Plano (Para el buscador del POS/Ventas)
        if (String(filters.paginate) === 'false') {
            return await ClientModel.findAllDynamic(filters);
        }

        // 2. Modo Paginado (Para la vista de administración)
        const limit = Number(filters.limit) || 10;
        const page = Number(filters.page) || 1;
        const offset = (page - 1) * limit;

        filters.limit = limit;
        filters.offset = offset;

        const [totalItems, clients] = await Promise.all([
            ClientModel.countDynamic(filters),
            ClientModel.findAllDynamic(filters)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: clients,
            meta: {
                currentPage: page,
                lastPage: totalPages,
                itemsPerPage: limit,
                totalItems: totalItems,
                nextPage: page < totalPages ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null
            }
        };
    },

    /**
     * @description Busca un cliente por su llave primaria. Falla rápido si no existe.
     * @param {number|string} id - Identificador único del cliente.
     * @throws {Error} Error HTTP 404 si el cliente no se encuentra.
     * @returns {Promise<Object>} Datos del cliente.
     */
    getClientById: async (id) => {
        const client = await ClientModel.findById(id);
        if (!client) {
            const error = new Error("El cliente solicitado no existe en el sistema.");
            error.statusCode = 404;
            throw error;
        }
        return client;
    },

    /**
     * @description Registra un nuevo cliente garantizando la unicidad de su documento.
     * @param {Object} data - Datos del cliente validados por el esquema.
     * @throws {Error} Error HTTP 400 si el documento ya está registrado.
     * @returns {Promise<Object>} Cliente insertado.
     */
    createClient: async (data) => {
        const existingClient = await ClientModel.findByDocument(data.document_number);
        if (existingClient) {
            const error = new Error("Infracción de unicidad: El número de documento ya está registrado.");
            error.statusCode = 400;
            throw error;
        }

        const newId = await ClientModel.create(data);
        return await ClientModel.findById(newId);
    },

    /**
     * @description Actualiza un cliente garantizando que no usurpe el documento de otro registro.
     * @param {number|string} id - Identificador del cliente.
     * @param {Object} data - Datos a actualizar.
     * @throws {Error} Error HTTP 400 en colisión de documento, 404 si no existe.
     * @returns {Promise<Object>} Cliente actualizado.
     */
    updateClient: async (id, data) => {
        await ClientService.getClientById(id); // Fail-fast: Valida existencia

        const existingClient = await ClientModel.findByDocument(data.document_number);
        if (existingClient && String(existingClient.id) !== String(id)) {
            const error = new Error("Conflicto de identidad: El número de documento proporcionado pertenece a otro cliente.");
            error.statusCode = 400;
            throw error;
        }

        await ClientModel.update(id, data);
        return await ClientModel.findById(id);
    },

    /**
     * @description Elimina un cliente capturando errores de integridad referencial.
     * @param {number|string} id - Identificador del cliente.
     * @throws {Error} Error HTTP 409 si el cliente posee ventas vinculadas.
     * @returns {Promise<void>}
     */
    deleteClient: async (id) => {
        await ClientService.getClientById(id);

        try {
            await ClientModel.delete(id);
        } catch (dbError) {
            // Captura de violación de Foreign Key estandarizada de MySQL
            if (dbError.code === 'ER_ROW_IS_REFERENCED_2' || dbError.errno === 1451) {
                const error = new Error("Bloqueo de seguridad: No se puede eliminar el cliente porque posee historial de ventas asociado.");
                error.statusCode = 409; 
                throw error;
            }
            throw dbError; 
        }
    }
};