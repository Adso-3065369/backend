/**
 * @file 05-role.service.test.js
 * @description Suite unitaria para RoleService (Caja Blanca Estricta).
 */
import { jest } from '@jest/globals';

// 1. Mocks absolutos de la capa de datos
jest.unstable_mockModule('../models/role.model.js', () => ({
    RoleModel: {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countUsersByRoleId: jest.fn()
    }
}));

jest.unstable_mockModule('../models/permission.model.js', () => ({
    PermissionModel: {
        findAllAssigned: jest.fn(),
        findByRoleId: jest.fn()
    }
}));

// 2. Importación dinámica pos-inyección
const { RoleService } = await import('../services/role.service.js');
const { RoleModel } = await import('../models/role.model.js');
const { PermissionModel } = await import('../models/permission.model.js');

describe('Suite Unitaria: RoleService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('[getRolesWithPermissions] - Ensamblaje masivo', () => {
        
        test('1. Debe cruzar roles y permisos eliminando la llave foránea (role_id)', async () => {
            const mockRoles = [
                { id: 1, name: 'Admin' },
                { id: 2, name: 'Editor' }
            ];
            const mockPermissions = [
                { id: 10, role_id: 1, name: 'Read', code: 'R', description: 'Read data' },
                { id: 11, role_id: 1, name: 'Write', code: 'W', description: 'Write data' },
                { id: 12, role_id: 2, name: 'Read', code: 'R', description: 'Read data' }
            ];

            RoleModel.findAll.mockResolvedValue(mockRoles);
            PermissionModel.findAllAssigned.mockResolvedValue(mockPermissions);

            const result = await RoleService.getRolesWithPermissions();

            expect(RoleModel.findAll).toHaveBeenCalledWith(); // Aserción estricta de ausencia de parámetros
            expect(PermissionModel.findAllAssigned).toHaveBeenCalledWith();
            
        expect(result).toStrictEqual([
            {
                id: 1,
                name: 'Admin',
                permissions: [
                    { id: 10, name: 'Read', code: 'R', description: 'Read data' },
                    { id: 11, name: 'Write', code: 'W', description: 'Write data' }
                ]
            },
            {
                id: 2,
                name: 'Editor',
                permissions: [
                    { id: 12, name: 'Read', code: 'R', description: 'Read data' }
                ]
            }
        ]);
            
            // Verificación de aislamiento estructural
            expect(result[0].permissions[0]).not.toHaveProperty('role_id');
        });

        test('2. Debe retornar roles con arreglos vacíos si no hay permisos asignados en el sistema', async () => {
            RoleModel.findAll.mockResolvedValue([{ id: 1, name: 'Guest' }]);
            PermissionModel.findAllAssigned.mockResolvedValue([]);

            const result = await RoleService.getRolesWithPermissions();

            expect(result[0].permissions).toStrictEqual([]);
        });

        test('3. [Resiliencia] Debe propagar excepciones no controladas originadas en la capa de datos', async () => {
            const dbError = new Error('Database connection lost');
            RoleModel.findAll.mockRejectedValue(dbError);

            await expect(RoleService.getRolesWithPermissions()).rejects.toThrow('Database connection lost');
        });
    });

    describe('[getRoleByIdWithPermissions] - Consulta individual', () => {
        
        test('4. Debe retornar el objeto unificado si el identificador existe', async () => {
            const mockRole = { id: 1, name: 'Admin' };
            const mockPermissions = [{ id: 10, name: 'Read' }];
            
            RoleModel.findById.mockResolvedValue(mockRole);
            PermissionModel.findByRoleId.mockResolvedValue(mockPermissions);

            const result = await RoleService.getRoleByIdWithPermissions(1);

            expect(RoleModel.findById).toHaveBeenCalledWith(1);
            expect(PermissionModel.findByRoleId).toHaveBeenCalledWith(1);
            expect(result).toStrictEqual({ ...mockRole, permissions: mockPermissions });
        });

        test('5. Debe aplicar validación temprana y retornar null evadiendo consultas secundarias', async () => {
            RoleModel.findById.mockResolvedValue(null);
            
            const result = await RoleService.getRoleByIdWithPermissions(999);

            expect(result).toBeNull();
            expect(PermissionModel.findByRoleId).not.toHaveBeenCalled(); // Evita sobrecarga de BD
        });
    });

    describe('[createRole] - Inserción y recuperación', () => {
        
        test('6. Debe ejecutar la inserción y reciclar la consulta por ID para retornar el payload estructural completo', async () => {
            const roleData = { name: 'New Role' };
            const newId = 5;
            
            RoleModel.create.mockResolvedValue(newId);
            RoleModel.findById.mockResolvedValue({ id: newId, ...roleData });
            PermissionModel.findByRoleId.mockResolvedValue([]);

            const result = await RoleService.createRole(roleData);

            expect(RoleModel.create).toHaveBeenCalledWith(roleData);
            expect(RoleModel.findById).toHaveBeenCalledWith(newId);
            expect(result).toStrictEqual({ id: newId, name: 'New Role', permissions: [] });
        });
    });

    describe('[updateRole] - Mutación condicional', () => {
        
        test('7. Debe abortar la transacción y retornar null si el registro previo no existe', async () => {
            RoleModel.findById.mockResolvedValue(null);

            const result = await RoleService.updateRole(999, { name: 'Ghost' });

            expect(result).toBeNull();
            expect(RoleModel.update).not.toHaveBeenCalled();
        });

        test('8. Debe procesar la actualización y retornar el objeto consolidado final', async () => {
            const targetId = 1;
            const updatePayload = { name: 'Updated Role' };
            
            RoleModel.findById
                .mockResolvedValueOnce({ id: targetId, name: 'Old Role' }) 
                .mockResolvedValueOnce({ id: targetId, name: 'Updated Role' }); 
                
            RoleModel.update.mockResolvedValue(true);
            PermissionModel.findByRoleId.mockResolvedValue([]);

            const result = await RoleService.updateRole(targetId, updatePayload);

            expect(RoleModel.update).toHaveBeenCalledWith(targetId, updatePayload);
            expect(result).toStrictEqual({ id: targetId, name: 'Updated Role', permissions: [] });
        });
    });

    describe('[deleteRole] - Control de Integridad Referencial (DTO Payload)', () => {
        
        test('9. Debe retornar DTO de error 404 si el objetivo de supresión no es localizado', async () => {
            RoleModel.findById.mockResolvedValue(null);

            const result = await RoleService.deleteRole(999);

            expect(RoleModel.findById).toHaveBeenCalledWith(999);
            expect(RoleModel.delete).not.toHaveBeenCalled();
            expect(result).toStrictEqual({ 
                success: false, 
                status: 404, 
                message: "El rol especificado no existe." 
            });
        });

        test('10. Debe bloquear la destrucción (HTTP 400) violaciones de foreign key en usuarios activos', async () => {
            const targetId = 1;
            RoleModel.findById.mockResolvedValue({ id: targetId, name: 'Admin' });
            RoleModel.countUsersByRoleId.mockResolvedValue(5); 

            const result = await RoleService.deleteRole(targetId);

            expect(RoleModel.countUsersByRoleId).toHaveBeenCalledWith(targetId);
            expect(RoleModel.delete).not.toHaveBeenCalled();
            
            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toContain("5 usuario(s)");
        });

        test('11. Debe completar la purga física y retornar el DTO de confirmación', async () => {
            const targetId = 2;
            RoleModel.findById.mockResolvedValue({ id: targetId, name: 'Guest' });
            RoleModel.countUsersByRoleId.mockResolvedValue(0);
            RoleModel.delete.mockResolvedValue(true);

            const result = await RoleService.deleteRole(targetId);

            expect(RoleModel.delete).toHaveBeenCalledWith(targetId);
            expect(result).toStrictEqual({ 
                success: true, 
                status: 200, 
                message: "Rol y sus permisos asociados eliminados exitosamente." 
            });
        });
    });
});