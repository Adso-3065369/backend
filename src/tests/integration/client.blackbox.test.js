/**
 * @file client.blackbox.test.js
 * @description Suite de Pruebas de Integración - Directorio de Clientes (Caja Negra).
 * Valida la seguridad, paginación matemática, modo plano y filtros de búsqueda dinámica por HTTP.
 */

import request from 'supertest';
import app from '../../app.js';
import pool from '../../config/db.js'; // Importación restringida a Fases Setup/Teardown
import { UserModel } from '../../models/user.model.js'; // Importación restringida a Fases Setup/Teardown

// ============================================================================
// 1. GESTIÓN DE ESTADO AISLADO
// ============================================================================
const timestamp = Date.now();

const authorizedUser = {
    name: 'Admin Clientes',
    email: `admin_clients_${timestamp}@saas.com`,
    password: 'Password123#'
};

const unauthorizedUser = {
    name: 'Usuario Sin Permisos',
    email: `intruso_clients_${timestamp}@saas.com`,
    password: 'Password123#'
};

let validToken = ''; 
let invalidToken = ''; 
let injectedPermissionId = null;
let testClientIds = []; 

// ============================================================================
// 2. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Integración: Filtros y Paginación de Clientes', () => {

    // FASE: SETUP (Preparación de la masa de datos - Caja Gris)
    beforeAll(async () => {
        // A. Seguridad y Permisos ('clients.index')
        const [permExists] = await pool.query("SELECT id FROM permissions WHERE code = 'clients.index'");
        if (permExists.length === 0) {
            const [newPerm] = await pool.query("INSERT INTO permissions (name, code) VALUES ('Listar Clientes', 'clients.index')");
            injectedPermissionId = newPerm.insertId;
        } else {
            injectedPermissionId = permExists[0].id;
        }
        await pool.query("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [injectedPermissionId]);

        // B. Usuarios y Tokens vía HTTP
        await request(app).post('/api/auth/register').send(authorizedUser);
        const authUserRecord = await UserModel.findByEmail(authorizedUser.email);
        if (authUserRecord) {
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [authUserRecord.id, 1]);
        }
        
        const authLogin = await request(app).post('/api/auth/login').send({
            email: authorizedUser.email,
            password: authorizedUser.password
        });
        validToken = authLogin.body.data.accessToken;

        await request(app).post('/api/auth/register').send(unauthorizedUser);
        
        const unauthLogin = await request(app).post('/api/auth/login').send({
            email: unauthorizedUser.email,
            password: unauthorizedUser.password
        });
        invalidToken = unauthLogin.body.data.accessToken;

        // C. Data Seeding: Inserción masiva de 15 clientes para forzar la paginación matemática
        const clientPromises = [];
        for (let i = 1; i <= 15; i++) {
            const clientName = i === 15 ? `Buscame ADSO ${timestamp}` : `Cliente Paginacion ${timestamp} - ${i}`;
            const docNumber = `DOC-${timestamp}-${i}`;
            const email = `paginacion${i}_${timestamp}@test.com`;
            
            clientPromises.push(
                pool.query("INSERT INTO clients (document_number, name, email) VALUES (?, ?, ?)", [docNumber, clientName, email])
            );
        }
        
        const results = await Promise.all(clientPromises);
        testClientIds = results.map(res => res[0].insertId);
    });

    // FASE: TEARDOWN (Limpieza - Caja Gris)
    afterAll(async () => {
        if (testClientIds.length > 0) {
            const placeholders = testClientIds.map(() => '?').join(',');
            await pool.query(`DELETE FROM clients WHERE id IN (${placeholders})`, testClientIds);
        }

        if (injectedPermissionId) {
            await pool.query("DELETE FROM role_permissions WHERE permission_id = ?", [injectedPermissionId]);
        }

        const aUser = await UserModel.findByEmail(authorizedUser.email);
        if (aUser) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [aUser.id]);
            await UserModel.delete(aUser.id);
        }

        const uUser = await UserModel.findByEmail(unauthorizedUser.email);
        if (uUser) await UserModel.delete(uUser.id);
        
        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // CASOS DE PRUEBA (CAJA NEGRA PURA DESDE AQUÍ)
    // ========================================================================

    test('1. [SEGURIDAD - 401] Debe rechazar la petición si NO hay token', async () => {
        const res = await request(app).get('/api/clients'); 
        expect(res.statusCode).toBe(401);
    });

    test('2. [SEGURIDAD - 403] Debe rechazar la petición si NO tiene permiso clients.index', async () => {
        const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${invalidToken}`);
        expect([401, 403]).toContain(res.statusCode);
    });

    test('3. [PAGINACIÓN - DEFAULT] Debe retornar la primera página con máximo 10 registros y metadata', async () => {
        const res = await request(app)
            .get('/api/clients')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(200);
        
        const responseData = res.body.data;
        expect(responseData).toHaveProperty('data');
        expect(responseData).toHaveProperty('meta');
        
        expect(responseData.data.length).toBeLessThanOrEqual(10);
        expect(responseData.meta.currentPage).toBe(1);
        expect(responseData.meta.itemsPerPage).toBe(10);
        expect(responseData.meta.totalItems).toBeGreaterThanOrEqual(15); 
    });

    test('4. [PAGINACIÓN - CUSTOM] Debe respetar los límites y páginas enviadas por Query Params', async () => {
        const res = await request(app)
            .get('/api/clients?page=2&limit=5')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(200);
        const responseData = res.body.data;

        expect(responseData.data.length).toBeLessThanOrEqual(5);
        expect(responseData.meta.currentPage).toBe(2);
        expect(responseData.meta.itemsPerPage).toBe(5);
        expect(responseData.meta.prevPage).toBe(1); 
    });

    test('5. [FILTRO - BÚSQUEDA] Debe retornar un arreglo filtrado por el nombre buscado', async () => {
        const searchTerm = `Buscame ADSO ${timestamp}`;
        const res = await request(app)
            .get(`/api/clients?search=${encodeURIComponent(searchTerm)}`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(200);
        const responseData = res.body.data;

        expect(responseData.data.length).toBeGreaterThan(0);
        expect(responseData.data[0].name).toBe(searchTerm);
    });

    test('6. [MODO PLANO - POS] Debe retornar un arreglo directo SIN metadata si paginate=false', async () => {
        const res = await request(app)
            .get('/api/clients?paginate=false')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(200);
        
        const isArray = Array.isArray(res.body.data);
        expect(isArray).toBe(true);
        expect(res.body.data).not.toHaveProperty('meta');
    });

    test('7. [GET POR ID] Debe recuperar los datos exactos de un cliente específico', async () => {
        const targetId = testClientIds[0];
        
        const res = await request(app)
            .get(`/api/clients/${targetId}`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('id', targetId);
        expect(res.body.data).toHaveProperty('document_number');
        expect(res.body.data).toHaveProperty('name');
    });

    test('8. [PUT] Debe actualizar la información del cliente y reflejar los cambios vía API', async () => {
        const targetId = testClientIds[0];
        const shortTimestamp = String(timestamp).slice(-10); 

        const updatePayload = {
            document_number: `UPD-${shortTimestamp}`, 
            name: `Cliente Actualizado ${shortTimestamp}`,
            email: `update_${shortTimestamp}@test.com`,
            phone: '300 123 4567' 
        };

        // 1. Ejecutamos la actualización por HTTP
        const res = await request(app)
            .put(`/api/clients/${targetId}`)
            .set('Authorization', `Bearer ${validToken}`)
            .send(updatePayload);

        expect(res.statusCode).toBe(200);

        // 2. CORRECCIÓN CAJA NEGRA: Consultamos el recurso modificado por HTTP para verificar la persistencia real
        const verifyRes = await request(app)
            .get(`/api/clients/${targetId}`)
            .set('Authorization', `Bearer ${validToken}`);
        
        expect(verifyRes.statusCode).toBe(200);
        expect(verifyRes.body.data.document_number).toBe(updatePayload.document_number);
        expect(verifyRes.body.data.name).toBe(updatePayload.name);
        expect(verifyRes.body.data.email).toBe(updatePayload.email);
        expect(verifyRes.body.data.phone).toBe(updatePayload.phone);
    });

    // Variable compartida para los flujos de destrucción secuenciales
    let deletedClientId = null;

    test('9. [DELETE] Debe eliminar el cliente correctamente', async () => {
        deletedClientId = testClientIds[0];

        const res = await request(app)
            .delete(`/api/clients/${deletedClientId}`)
            .set('Authorization', `Bearer ${validToken}`);

        expect([200, 204]).toContain(res.statusCode);

        // Se extrae del arreglo para evitar duplicidad de eliminación en el Teardown global
        testClientIds = testClientIds.filter(id => id !== deletedClientId);
    });

    test('10. [GET POR ID - 404] Debe retornar Not Found al buscar el cliente eliminado', async () => {
        const res = await request(app)
            .get(`/api/clients/${deletedClientId}`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });    
});