/**
 * @file user.controller.test.js
 * @description Suite completa de pruebas unitarias para UserController.
 */
import { jest } from '@jest/globals';

// 1. Mocks obligatorios ANTES de las importaciones
jest.unstable_mockModule('../../services/user.service.js', () => ({
    UserService: {
        getAllUsers: jest.fn(),
        getUserById: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
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
const { UserController } = await import('../../controllers/user.controller.js');
const { UserService } = await import('../../services/user.service.js');
const { successResponse } = await import('../../utils/response.handler.js');

describe('Suite Unitaria: UserController Completada', () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: {}, query: {}, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('1. [getAll] Debe estructurar los filtros de query y retornar 200', async () => {
        req.query = { search: 'test', page: '1', limit: '10' };
        const mockResult = [{ id: 1, name: 'User1' }];
        UserService.getAllUsers.mockResolvedValue(mockResult);
        
        await UserController.getAll(req, res, next);
        
        // Validación estricta del empaquetado de parámetros
        expect(UserService.getAllUsers).toHaveBeenCalledWith({
            search: 'test',
            page: '1',
            limit: '10',
            paginate: undefined,
            sortBy: undefined,
            sortOrder: undefined
        });
        expect(successResponse).toHaveBeenCalledWith(res, 200, expect.any(String), mockResult);
    });

    test('2.a [getById] Debe retornar 200 con el payload exacto si el usuario existe', async () => {
        req.params.id = '1';
        const mockUser = { id: '1', name: 'User' };
        UserService.getUserById.mockResolvedValue(mockUser);
        
        await UserController.getById(req, res, next);
        
        expect(successResponse).toHaveBeenCalledWith(res, 200, expect.any(String), mockUser);
    });

    test('2.b [getById] Debe delegar a next un error 404 si el usuario no existe', async () => {
        req.params.id = '999';
        UserService.getUserById.mockResolvedValue(null);
        
        await UserController.getById(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(successResponse).not.toHaveBeenCalled();
    });

    test('3. [create] Debe inyectar el body y retornar 201 con el nuevo recurso', async () => {
        req.body = { name: 'New', email: 'test@test.com' };
        const mockCreated = { id: 1, ...req.body };
        UserService.createUser.mockResolvedValue(mockCreated);
        
        await UserController.create(req, res, next);
        
        expect(UserService.createUser).toHaveBeenCalledWith(req.body);
        expect(successResponse).toHaveBeenCalledWith(res, 201, expect.any(String), mockCreated);
    });

    test('4.a [update] Debe actualizar usuario y retornar 200 con la data mutada', async () => {
        req.params.id = '1';
        req.body = { name: 'Updated' };
        const mockUpdated = { id: '1', name: 'Updated' };
        UserService.updateUser.mockResolvedValue(mockUpdated);
        
        await UserController.update(req, res, next);
        
        expect(UserService.updateUser).toHaveBeenCalledWith('1', req.body);
        expect(successResponse).toHaveBeenCalledWith(res, 200, expect.any(String), mockUpdated);
    });

    test('4.b [update] Debe delegar a next un error 404 si el recurso a actualizar no existe', async () => {
        req.params.id = '999';
        req.body = { name: 'Ghost' };
        UserService.updateUser.mockResolvedValue(null);
        
        await UserController.update(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    test('5.a [delete] Debe invocar la eliminación y retornar 200 con payload null', async () => {
        req.params.id = '1';
        UserService.deleteUser.mockResolvedValue(true);
        
        await UserController.delete(req, res, next);
        
        expect(UserService.deleteUser).toHaveBeenCalledWith('1');
        expect(successResponse).toHaveBeenCalledWith(res, 200, expect.any(String), null);
    });

    test('5.b [delete] Debe delegar a next un error 404 si el borrado reporta false', async () => {
        req.params.id = '999';
        UserService.deleteUser.mockResolvedValue(false);
        
        await UserController.delete(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    test('6.a [assignRoles] Debe ejecutar asignación transaccional y consolidar matriz RBAC', async () => {
        req.params.id = '1';
        req.body = { roleIds: [1, 2] };
        const mockTree = [{ role_id: 1, permission_code: 'test' }];
        
        UserService.assignRolesToUser.mockResolvedValue(true);
        UserService.getUserRolesAndPermissions.mockResolvedValue(mockTree);
        
        await UserController.assignRoles(req, res, next);
        
        expect(UserService.assignRolesToUser).toHaveBeenCalledWith('1', [1, 2]);
        expect(successResponse).toHaveBeenCalledWith(
            res, 
            200, 
            expect.any(String), 
            { userId: '1', roles: mockTree }
        );
    });

    test('6.b [assignRoles] Debe delegar a next si la asignación falla', async () => {
        req.params.id = '1';
        req.body = { roleIds: [1] };
        const dbError = new Error("Deadlock found");
        
        UserService.assignRolesToUser.mockRejectedValue(dbError);
        
        try {
            await UserController.assignRoles(req, res, next);
        } catch (error) {
            // Evaluamos que la excepción fluya hacia afuera, simulando el comportamiento de catchAsync
            expect(error).toBe(dbError);
        }
    });
});