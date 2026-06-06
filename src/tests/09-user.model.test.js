/**
 * @file 09-user.model.test.js
 * @description Suite de Pruebas de Integración Directa - Modelo de Usuarios.
 * Evalúa consultas dinámicas, agregaciones JSON, RBAC y operaciones transaccionales inyectadas.
 */

import pool from '../config/db.js';
import { UserModel } from '../models/user.model.js';

const timestamp = Date.now();

// Variables de estado
let testUserId = null;
let testRoleId = null;
let testPermissionId = null;
let testClientId = null;
let testSaleId = null;

const testEmail = `model_user_${timestamp}@saas.com`;

describe('Suite de Integración: Modelo de Usuarios y RBAC', () => {

    beforeAll(async () => {
        // 1. Crear el usuario base usando el mismo modelo
        const newUser = await UserModel.create({
            name: `Usuario Test ${timestamp}`,
            email: testEmail,
            password: 'hashed_password'
        });
        testUserId = newUser.id;

        // 2. Preparar el ecosistema RBAC (Rol y Permiso)
        const [role] = await pool.query("INSERT INTO roles (name) VALUES (?)", [`Role_${timestamp}`]);
        testRoleId = role.insertId;

        const [perm] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", ['Test Perm', `test.code.${timestamp}`]);
        testPermissionId = perm.insertId;

        await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [testRoleId, testPermissionId]);
        await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [testUserId, testRoleId]);

        // 3. Preparar una venta para validar el subquery 'sales_count'
        const [client] = await pool.query("INSERT INTO clients (document_number, name) VALUES (?, ?)", [`DOC-${timestamp}`, 'Cliente Test']);
        testClientId = client.insertId;

        const [sale] = await pool.query("INSERT INTO sales (client_id, user_id, total) VALUES (?, ?, 100)", [testClientId, testUserId]);
        testSaleId = sale.insertId;
    });

    afterAll(async () => {
        // Limpieza inversa estricta
        if (testSaleId) await pool.query("DELETE FROM sales WHERE id = ?", [testSaleId]);
        if (testClientId) await pool.query("DELETE FROM clients WHERE id = ?", [testClientId]);
        
        if (testUserId) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [testUserId]);
            await UserModel.delete(testUserId);
        }
        
        if (testRoleId) {
            await pool.query("DELETE FROM role_permissions WHERE role_id = ?", [testRoleId]);
            await pool.query("DELETE FROM roles WHERE id = ?", [testRoleId]);
        }
        
        if (testPermissionId) await pool.query("DELETE FROM permissions WHERE id = ?", [testPermissionId]);

        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // LECTURAS, ESCRITURAS ESTÁNDAR Y AGREGACIONES JSON
    // ========================================================================

    test('1. [findByEmail & findById] Debe retornar la identidad con el conteo de ventas y roles integrados (JSON)', async () => {
        const userByEmail = await UserModel.findByEmail(testEmail);
        expect(userByEmail).toBeDefined();
        expect(userByEmail.id).toBe(testUserId);

        const fullUser = await UserModel.findById(testUserId);
        expect(fullUser).toBeDefined();
        
        // Validación de Subconsultas Escalares
        expect(Number(fullUser.sales_count)).toBe(1); 
        
        // Validación de JSON_ARRAYAGG
        expect(Array.isArray(fullUser.roles)).toBe(true);
        expect(fullUser.roles.length).toBe(1);
        expect(fullUser.roles[0].id).toBe(testRoleId);
        expect(fullUser.roles[0].name).toBe(`Role_${timestamp}`);
    });

    test('2. [update] Debe actualizar datos básicos del usuario', async () => {
        const updateData = { name: 'Nombre Modificado', email: testEmail };
        const updatedUser = await UserModel.update(testUserId, updateData);
        
        expect(updatedUser.name).toBe('Nombre Modificado');
    });

    test('3. [updateRefreshToken & clearRefreshToken] Debe inyectar y revocar el token de sesión', async () => {
        const mockHash = 'refresh_hash_abc123';
        
        const isUpdated = await UserModel.updateRefreshToken(testUserId, mockHash);
        expect(isUpdated).toBe(true);
        
        const userWithToken = await UserModel.findById(testUserId);
        expect(userWithToken.refresh_token).toBe(mockHash);

        const isCleared = await UserModel.clearRefreshToken(testUserId);
        expect(isCleared).toBe(true);
        
        const userCleared = await UserModel.findById(testUserId);
        expect(userCleared.refresh_token).toBeNull();
    });

    // ========================================================================
    // BÚSQUEDA DINÁMICA
    // ========================================================================

    test('4. [countDynamic & findAllDynamic] Debe aplicar filtros LIKE y soportar paginación', async () => {
        const filters = { search: 'Nombre Modific', limit: 5, offset: 0, sortBy: 'sales_count', sortOrder: 'DESC' };
        
        const total = await UserModel.countDynamic(filters);
        expect(Number(total)).toBe(1);

        const list = await UserModel.findAllDynamic(filters);
        expect(list.length).toBe(1);
        expect(list[0].id).toBe(testUserId);
        expect(Number(list[0].sales_count)).toBe(1);
    });

    // ========================================================================
    // CONSULTAS RBAC
    // ========================================================================

    test('5. [getRawUserPermissions] Debe retornar matriz plana de códigos de permiso', async () => {
        const permissions = await UserModel.getRawUserPermissions(testUserId);
        
        expect(permissions.length).toBe(1);
        expect(permissions[0].code).toBe(`test.code.${timestamp}`);
    });

    test('6. [getRawUserRolesAndPermissions] Debe retornar tabla relacional cruda para el frontend', async () => {
        const rbacMatrix = await UserModel.getRawUserRolesAndPermissions(testUserId);
        
        expect(rbacMatrix.length).toBe(1);
        expect(rbacMatrix[0].role_id).toBe(testRoleId);
        expect(rbacMatrix[0].permission_code).toBe(`test.code.${timestamp}`);
    });

    // ========================================================================
    // TRANSACCIONES INYECTADAS
    // ========================================================================

    test('7. [deleteUserRoles & insertUserRolesBulk] Debe manipular roles bajo una conexión externa', async () => {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Eliminar
            await UserModel.deleteUserRoles(testUserId, connection);
            const [emptyCheck] = await connection.query("SELECT * FROM user_roles WHERE user_id = ?", [testUserId]);
            expect(emptyCheck.length).toBe(0);

            // Reinsertar en Bulk
            const matrix = [[testUserId, testRoleId]];
            await UserModel.insertUserRolesBulk(matrix, connection);
            
            const [insertCheck] = await connection.query("SELECT * FROM user_roles WHERE user_id = ?", [testUserId]);
            expect(insertCheck.length).toBe(1);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    });

    // ========================================================================
    // DESTRUCCIÓN
    // ========================================================================

    test('8. [delete] Debe ejecutar Hard Delete del usuario', async () => {
        // Remover dependencias manuales para evitar error de FK
        await pool.query("DELETE FROM user_roles WHERE user_id = ?", [testUserId]);
        await pool.query("DELETE FROM sales WHERE user_id = ?", [testUserId]);

        const isDeleted = await UserModel.delete(testUserId);
        expect(isDeleted).toBe(true);

        const checkUser = await UserModel.findById(testUserId);
        expect(checkUser).toBeUndefined();
        
        // Evitar doble borrado en el afterAll
        testUserId = null; 
    });
});