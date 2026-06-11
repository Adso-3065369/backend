/**
 * @file 08-role.model.test.js
 * @description Suite de Pruebas de Integración Directa - Modelo de Roles y Transacciones ACID.
 */

import pool from '../config/db.js';
import { RoleModel } from '../models/role.model.js'; 

const timestamp = Date.now();

let testRoleId = null;
let testUserId = null;
let perm1Id = null;
let perm2Id = null;

describe('Suite de Integración: Modelo de Roles (Transacciones y Rollbacks)', () => {

    beforeAll(async () => {
        // 1. Inyección de dependencias para las llaves foráneas
        const [uRes] = await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
            ['User Test', `role_test_${timestamp}@saas.com`, 'hash']
        );
        testUserId = uRes.insertId;

        const [p1] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", ['Permiso A', `A.${timestamp}`]);
        perm1Id = p1.insertId;

        const [p2] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", ['Permiso B', `B.${timestamp}`]);
        perm2Id = p2.insertId;
    });

    afterAll(async () => {
        // 2. Limpieza estricta: Eliminar relaciones pivote primero para evitar bloqueos
        if (testUserId) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [testUserId]);
            await pool.query("DELETE FROM users WHERE id = ?", [testUserId]);
        }
        if (testRoleId) {
            await pool.query("DELETE FROM role_permissions WHERE role_id = ?", [testRoleId]);
            await pool.query("DELETE FROM roles WHERE id = ?", [testRoleId]);
        }
        if (perm1Id || perm2Id) {
            await pool.query("DELETE FROM permissions WHERE id IN (?, ?)", [perm1Id, perm2Id]);
        }
        
        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // CASOS DE ÉXITO (HAPPY PATHS)
    // ========================================================================

    test('1. [create] Debe insertar un rol y sus permisos en una transacción', async () => {
        const payload = {
            name: `Rol QA ${timestamp}`,
            description: 'Rol generado por suite de pruebas',
            permissionIds: [perm1Id]
        };

        testRoleId = await RoleModel.create(payload);
        expect(testRoleId).toBeGreaterThan(0);

        // Validación de la tabla pivote
        const [pivots] = await pool.query("SELECT permission_id FROM role_permissions WHERE role_id = ?", [testRoleId]);
        expect(pivots).toHaveLength(1);
        expect(pivots[0].permission_id).toBe(perm1Id);
    });

    test('2. [findById] Debe recuperar la información del rol insertado', async () => {
        const role = await RoleModel.findById(testRoleId);
        
        expect(role).toBeDefined();
        expect(role.id).toBe(testRoleId);
        expect(role.name).toContain('Rol QA');
    });

    test('3. [findAll] Debe recuperar el catálogo de roles', async () => {
        const roles = await RoleModel.findAll();
        expect(roles.length).toBeGreaterThan(0);
        
        const ids = roles.map(r => r.id);
        expect(ids).toContain(testRoleId);
    });

    test('4. [update] Debe actualizar el registro maestro y reemplazar los permisos (Wipe & Replace)', async () => {
        const updatePayload = {
            name: `Rol Modificado ${timestamp}`,
            description: 'Descripción alterada',
            permissionIds: [perm2Id] // Cambiamos de perm1 a perm2
        };

        const result = await RoleModel.update(testRoleId, updatePayload);
        expect(result).toBe(true);

        // Validación Maestro
        const role = await RoleModel.findById(testRoleId);
        expect(role.name).toBe(updatePayload.name);

        // Validación Pivote (Wipe & Replace)
        const [pivots] = await pool.query("SELECT permission_id FROM role_permissions WHERE role_id = ?", [testRoleId]);
        expect(pivots).toHaveLength(1);
        expect(pivots[0].permission_id).toBe(perm2Id);
    });

    test('5. [syncUserRoles] Debe limpiar y asignar roles a un usuario', async () => {
        const result = await RoleModel.syncUserRoles(testUserId, [testRoleId]);
        expect(result).toBe(true);

        const [userRoles] = await pool.query("SELECT role_id FROM user_roles WHERE user_id = ?", [testUserId]);
        expect(userRoles).toHaveLength(1);
        expect(userRoles[0].role_id).toBe(testRoleId);
    });

    test('6. [countUsersByRoleId] Debe contar correctamente las asignaciones activas', async () => {
        const count = await RoleModel.countUsersByRoleId(testRoleId);
        // Al menos 1, por la sincronización del test 5
        expect(Number(count)).toBeGreaterThanOrEqual(1);
    });

    // ========================================================================
    // COBERTURA DE TRANSACCIONES Y ROLLBACKS (UNHAPPY PATHS)
    // ========================================================================

    test('7. [create - ROLLBACK] Debe revertir la inserción si el permiso no existe', async () => {
        const invalidPayload = {
            name: `Rol Fantasma ${timestamp}`,
            permissionIds: [99999999] // ID inexistente para forzar Foreign Key Error
        };

        await expect(RoleModel.create(invalidPayload)).rejects.toThrow();

        // Aserción crítica: El rollback debió evitar que el "Rol Fantasma" se creara en el paso A.
        const [roles] = await pool.query("SELECT id FROM roles WHERE name = ?", [invalidPayload.name]);
        expect(roles).toHaveLength(0); 
    });

    test('8. [update - ROLLBACK] Debe revertir los cambios si falla la inserción de permisos', async () => {
        const originalRole = await RoleModel.findById(testRoleId);
        
        const invalidPayload = {
            name: 'Nombre Dañado',
            permissionIds: [99999999] // Dispara el fallo en el Paso C
        };

        await expect(RoleModel.update(testRoleId, invalidPayload)).rejects.toThrow();

        // Aserción crítica: El nombre no debió cambiar porque el rollback restauró el Paso A
        const intactRole = await RoleModel.findById(testRoleId);
        expect(intactRole.name).toBe(originalRole.name);
    });

    test('9. [syncUserRoles - ROLLBACK] Debe revertir la sincronización ante IDs inválidos', async () => {
        await expect(RoleModel.syncUserRoles(testUserId, [99999999])).rejects.toThrow();
        
        // Aserción: El usuario aún debe conservar sus roles anteriores (el DELETE del inicio hizo rollback)
        const [userRoles] = await pool.query("SELECT role_id FROM user_roles WHERE user_id = ?", [testUserId]);
        expect(userRoles).toHaveLength(1);
    });

    // ========================================================================
    // DESTRUCCIÓN
    // ========================================================================

    test('10. [delete] Debe eliminar las relaciones y el rol maestro de la base de datos', async () => {
        // Necesitamos limpiar user_roles manualmente primero, ya que el modelo asume que se manejó externamente 
        // o que hay un ON DELETE CASCADE configurado en BD. Si no, fallará por FK constraints.
        await pool.query("DELETE FROM user_roles WHERE role_id = ?", [testRoleId]);

        const result = await RoleModel.delete(testRoleId);
        expect(result).toBe(true);

        const checkRole = await RoleModel.findById(testRoleId);
        expect(checkRole).toBeNull();

        const [pivots] = await pool.query("SELECT * FROM role_permissions WHERE role_id = ?", [testRoleId]);
        expect(pivots).toHaveLength(0);
    });
});