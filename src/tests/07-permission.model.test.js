/**
 * @file 07-permission.model.test.js
 * @description Suite de Pruebas de Integración Directa - Modelo de Permisos.
 * Valida la ejecución de las consultas SQL y los mapeos de relaciones (Roles/Permisos).
 */

import pool from '../config/db.js';
import { PermissionModel } from '../models/permission.model.js'; // Ajusta la ruta si es necesario

// ============================================================================
// 1. GESTIÓN DE ESTADO AISLADO
// ============================================================================
const timestamp = Date.now();

let testRoleId = null;
let assignedPermId = null;
let unassignedPermId = null;

const assignedCode = `code.assign.${timestamp}`;
const unassignedCode = `code.unassign.${timestamp}`;

// ============================================================================
// 2. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Integración: Modelo de Permisos', () => {

    beforeAll(async () => {
        // A. Creación de un rol de prueba
        const [roleRes] = await pool.query("INSERT INTO roles (name, description) VALUES (?, ?)", [`Rol Test ${timestamp}`, 'Testing']);
        testRoleId = roleRes.insertId;

        // B. Creación de permisos (Uno para asignar, otro suelto para probar exclusión)
        const [perm1] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", [`Permiso Asignado`, assignedCode]);
        assignedPermId = perm1.insertId;

        const [perm2] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", [`Permiso Suelto`, unassignedCode]);
        unassignedPermId = perm2.insertId;

        // C. Vincular solo el primer permiso al rol
        await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [testRoleId, assignedPermId]);
    });

    afterAll(async () => {
        // Limpieza estricta de las tablas pivote y maestras
        if (testRoleId) await pool.query("DELETE FROM role_permissions WHERE role_id = ?", [testRoleId]);
        if (assignedPermId || unassignedPermId) {
            await pool.query("DELETE FROM permissions WHERE id IN (?, ?)", [assignedPermId, unassignedPermId]);
        }
        if (testRoleId) await pool.query("DELETE FROM roles WHERE id = ?", [testRoleId]);
        
        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // CASOS DE PRUEBA
    // ========================================================================

    test('1. [findAll] Debe retornar el catálogo completo de permisos', async () => {
        const results = await PermissionModel.findAll();
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThanOrEqual(2);

        // Extraemos los códigos devueltos para verificar que ambos permisos inyectados existen
        const codes = results.map(p => p.code);
        expect(codes).toContain(assignedCode);
        expect(codes).toContain(unassignedCode);
    });

    test('2. [findAllAssigned] Debe retornar los permisos que estén vinculados al menos a un rol', async () => {
        const results = await PermissionModel.findAllAssigned();
        
        const codes = results.map(p => p.code);
        // Debe contener el permiso que asignamos
        expect(codes).toContain(assignedCode);
        // NO debe contener el permiso huérfano (prueba el correcto funcionamiento del JOIN)
        expect(codes).not.toContain(unassignedCode);
    });

    test('3. [findByRoleId] Debe retornar exclusivamente los permisos de un rol específico', async () => {
        const results = await PermissionModel.findByRoleId(testRoleId);
        
        // El rol de prueba solo tiene 1 permiso asignado
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(assignedPermId);
        expect(results[0].code).toBe(assignedCode);
        expect(results[0]).toHaveProperty('name');
        expect(results[0]).toHaveProperty('description');
    });
});