import { ClientService } from "../services/client.service.js";
import { successResponse } from "../utils/response.handler.js";
import { catchAsync } from "../utils/catchAsync.js";

/**
 * @file client.controller.js
 * @description Controlador estandarizado para la entidad Clientes.
 * @quality_attributes
 * - Responsabilidad Única (SRP): Se limita a la recolección de parámetros HTTP y emisión de respuestas.
 * - Estandarización: Uso integral de 'catchAsync' para evitar caídas del servidor y 'successResponse' para contratos JSON uniformes.
 */
export const ClientController = {
    
    /**
     * @description Lista los clientes interceptando los parámetros dinámicos de URL.
     * @param {Object} req - Objeto de petición Express.
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Catálogo de clientes paginado o plano.
     */
    getAll: catchAsync(async (req, res) => {
        const filters = {
            search: req.query.search || null,
            page: req.query.page,
            limit: req.query.limit,
            paginate: req.query.paginate,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };

        const clients = await ClientService.getClientsList(filters);
        return successResponse(res, 200, 'Directorio de clientes recuperado exitosamente.', clients);
    }),

    /**
     * @description Obtiene un cliente por su ID.
     * @param {Object} req - Objeto de petición Express (params: id).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Datos del cliente.
     */
    getById: catchAsync(async (req, res) => {
        const client = await ClientService.getClientById(req.params.id);
        return successResponse(res, 200, "Perfil del cliente recuperado exitosamente.", client);
    }),

    /**
     * @description Delega la creación de un nuevo cliente.
     * @param {Object} req - Objeto de petición Express (body: clientData).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Cliente recién creado.
     */
    create: catchAsync(async (req, res) => {
        const newClient = await ClientService.createClient(req.body);
        return successResponse(res, 201, "Cliente registrado exitosamente en el sistema.", newClient);
    }),

    /**
     * @description Actualiza los datos de un cliente.
     * @param {Object} req - Objeto de petición Express (params: id, body: clientData).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Cliente actualizado.
     */
    update: catchAsync(async (req, res) => {
        const updatedClient = await ClientService.updateClient(req.params.id, req.body);
        return successResponse(res, 200, "Datos del cliente actualizados correctamente.", updatedClient);
    }),

    /**
     * @description Elimina un cliente del sistema.
     * @param {Object} req - Objeto de petición Express (params: id).
     * @param {Object} res - Objeto de respuesta Express.
     * @returns {Promise<void>} Confirmación de eliminación.
     */
    delete: catchAsync(async (req, res) => {
        await ClientService.deleteClient(req.params.id);
        return successResponse(res, 200, "Cliente eliminado permanentemente del sistema.");
    })
};