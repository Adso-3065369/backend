/**
 * @file role.controller.test.js
 * @description Suite de pruebas unitarias exhaustiva para RoleController.
 * Garantiza 100% de cobertura de código aislando los servicios y utilidades.
 */
import { jest } from '@jest/globals';

// 1. Intercepción absoluta de dependencias ANTES de las importaciones
jest.unstable_mockModule('../../services/role.service.js', () => ({
    RoleService: {
        getRolesWithPermissions: jest.fn(),
        createRole: jest.fn(),
        getRoleByIdWithPermissions: jest.fn(),
        updateRole: jest.fn(),
        deleteRole: jest.fn()
    }
}));

jest.unstable_mockModule('../../services/user.service.js', () => ({
    UserService: {
        assignRolesToUser: jest.fn(),
        getUserRolesAndPermissions: jest.fn()
    }
}));

jest.unstable_mockModule('../../utils/response.handler.js', () => ({
    successResponse: jest.fn()
}));

jest.unstable_mockModule('../../utils/catchAsync.js', () => ({
    catchAsync: (fn) => fn 
}));

// 2. Importaciones dinámicas
const { RoleController } = await import('../../controllers/role.controller.js');
const { RoleService } = await import('../../services/role.service.js');
const { UserService } = await import('../../services/user.service.js');
const { successResponse } = await import('../../utils/response.handler.js');

describe('Suite Unitaria: RoleController', () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: {}, query: {}, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('[getAll] - Recuperación de directorio de roles', () => {
        test('Debe solicitar el listado de roles al servicio y responder HTTP 200', async () => {
            const mockRoles = [{ id: 1, name: 'Admin', permissions: [] }];
            RoleService.getRolesWithPermissions.mockResolvedValue(mockRoles);
            
            await RoleController.getAll(req, res, next);
            
            expect(RoleService.getRolesWithPermissions).toHaveBeenCalledTimes(1);
            expect(successResponse).toHaveBeenCalledWith(res, 200, "Roles obtenidos exitosamente", mockRoles);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('[create] - Creación de un nuevo rol', () => {
        test('Debe inyectar el payload del cliente en el servicio y responder HTTP 201', async () => {
            req.body = { name: 'Editor', permissions: [1, 2] };
            const mockCreatedRole = { id: 2, ...req.body };
            RoleService.createRole.mockResolvedValue(mockCreatedRole);
            
            await RoleController.create(req, res, next);
            
            expect(RoleService.createRole).toHaveBeenCalledWith(req.body);
            expect(successResponse).toHaveBeenCalledWith(res, 201, "Rol creado y configurado exitosamente", mockCreatedRole);
        });
    });

    describe('[getById] - Consulta específica de rol', () => {
        test('Debe retornar el rol solicitado con HTTP 200 si el registro existe', async () => {
            req.params.id = '1';
            const mockRole = { id: 1, name: 'Admin' };
            RoleService.getRoleByIdWithPermissions.mockResolvedValue(mockRole);
            
            await RoleController.getById(req, res, next);
            
            expect(RoleService.getRoleByIdWithPermissions).toHaveBeenCalledWith('1');
            expect(successResponse).toHaveBeenCalledWith(res, 200, "Rol obtenido exitosamente", mockRole);
        });

        test('Debe delegar al middleware un error HTTP 404 si el rol no existe', async () => {
            req.params.id = '999';
            RoleService.getRoleByIdWithPermissions.mockResolvedValue(null);
            
            await RoleController.getById(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            const errorArg = next.mock.calls[0][0];
            expect(errorArg).toBeInstanceOf(Error);
            expect(errorArg.message).toBe('Rol con ID 999 no encontrado');
            expect(errorArg.statusCode).toBe(404);
            expect(successResponse).not.toHaveBeenCalled();
        });
    });

    describe('[update] - Mutación de datos del rol', () => {
        test('Debe aplicar la actualización y retornar HTTP 200 con el objeto mutado', async () => {
            req.params.id = '1';
            req.body = { name: 'SuperAdmin' };
            const mockUpdated = { id: 1, name: 'SuperAdmin' };
            RoleService.updateRole.mockResolvedValue(mockUpdated);
            
            await RoleController.update(req, res, next);
            
            expect(RoleService.updateRole).toHaveBeenCalledWith('1', req.body);
            expect(successResponse).toHaveBeenCalledWith(res, 200, "Rol y permisos actualizados exitosamente", mockUpdated);
        });

        test('Debe abortar y delegar un error HTTP 404 si el motor rechaza la actualización (rol inexistente)', async () => {
            req.params.id = '999';
            req.body = { name: 'Ghost' };
            RoleService.updateRole.mockResolvedValue(null);
            
            await RoleController.update(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0][0].statusCode).toBe(404);
            expect(successResponse).not.toHaveBeenCalled();
        });
    });

    describe('[delete] - Supresión de roles', () => {
        test('Debe confirmar la eliminación y retornar HTTP 200 con payload nulo', async () => {
            req.params.id = '1';
            RoleService.deleteRole.mockResolvedValue({ success: true, message: "Rol eliminado" });
            
            await RoleController.delete(req, res, next);
            
            expect(RoleService.deleteRole).toHaveBeenCalledWith('1');
            expect(successResponse).toHaveBeenCalledWith(res, 200, "Rol eliminado", null);
        });

        test('Debe delegar error con código de estado explícito enviado por el servicio (ej. 409 Conflicto)', async () => {
            req.params.id = '1';
            // Simulación de violación de llave foránea u otra restricción
            RoleService.deleteRole.mockResolvedValue({ 
                success: false, 
                message: "El rol está en uso", 
                status: 409 
            });
            
            await RoleController.delete(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0][0].statusCode).toBe(409);
            expect(next.mock.calls[0][0].message).toBe('El rol está en uso');
        });

        test('Debe aplicar el operador de coalescencia lógica y asignar HTTP 400 si el servicio no provee un status', async () => {
            req.params.id = '2';
            // Cubre la rama condicional: `result.status || 400`
            RoleService.deleteRole.mockResolvedValue({ 
                success: false, 
                message: "Fallo de integridad" 
                // status ausente
            });
            
            await RoleController.delete(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0][0].statusCode).toBe(400); 
        });
    });

    describe('[assignRoles] - Orquestación Transaccional', () => {
        test('Debe ejecutar la asignación en UserService y recuperar el árbol de permisos actualizado', async () => {
            req.body = { userId: 1, roles: [1, 2] };
            const mockTree = [{ role_id: 1, name: 'Admin' }];
            
            UserService.assignRolesToUser.mockResolvedValue(true);
            UserService.getUserRolesAndPermissions.mockResolvedValue(mockTree);
            
            await RoleController.assignRoles(req, res, next);
            
            expect(UserService.assignRolesToUser).toHaveBeenCalledWith(1, [1, 2]);
            expect(UserService.getUserRolesAndPermissions).toHaveBeenCalledWith(1);
            expect(successResponse).toHaveBeenCalledWith(res, 200, "Roles y permisos actualizados correctamente", {
                userId: 1,
                roles: mockTree
            });
        });
    });
});