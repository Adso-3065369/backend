import { successResponse } from "../utils/response.handler.js";
import { catchAsync } from "../utils/catchAsync.js";
import { RoleService } from "../services/role.service.js";
import { UserService } from "../services/user.service.js"; 

/**
 * @file role.controller.js
 * @description Controlador estandarizado para la gestión de Roles y Permisos (RBAC).
 */
export const RoleController = {

    getAll: catchAsync(async (req, res) => {
        const rolesData = await RoleService.getRolesWithPermissions();
        return successResponse(res, 200, "Roles obtenidos exitosamente", rolesData);
    }),

    create: catchAsync(async (req, res) => {
        const roleData = req.body; 
        const newRole = await RoleService.createRole(roleData);
        return successResponse(res, 201, "Rol creado y configurado exitosamente", newRole);
    }),

    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const roleData = await RoleService.getRoleByIdWithPermissions(id);

        if (!roleData) {
            const error = new Error(`Rol con ID ${id} no encontrado`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Rol obtenido exitosamente", roleData);
    }),

    update: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const roleData = req.body; 
        
        const updatedRole = await RoleService.updateRole(id, roleData);

        if (!updatedRole) {
            const error = new Error(`El rol con ID ${id} no fue encontrado.`);
            error.statusCode = 404;
            return next(error);
        }

        return successResponse(res, 200, "Rol y permisos actualizados exitosamente", updatedRole);
    }),

    delete: catchAsync(async (req, res, next) => {
        const { id } = req.params;

        const result = await RoleService.deleteRole(id);

        if (!result.success) {
            const error = new Error(result.message);
            error.statusCode = result.status || 400;
            return next(error);
        }

        return successResponse(res, 200, result.message, null);
    }),

    assignRoles: catchAsync(async (req, res) => {
        const { userId, roles } = req.body;
        
        // 1. Ejecutamos la asignación transaccional (ACID) a través del servicio
        await UserService.assignRolesToUser(userId, roles);
        
        // 2. Solicitamos los datos ya formateados al mismo servicio
        const updatedRolesAndPermissions = await UserService.getUserRolesAndPermissions(userId);
        
        return successResponse(res, 200, "Roles y permisos actualizados correctamente", {
            userId,
            roles: updatedRolesAndPermissions
        });
    })
};