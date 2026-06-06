/**
 * @file sale.blackbox.test.js
 * @description Suite de Pruebas de Integración - Flujo Transaccional de Ventas (Caja Negra).
 * Las aserciones de negocio se realizan exclusivamente consumiendo la interfaz HTTP de la API.
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
    name: 'Cajero Autorizado',
    email: `cajero_${timestamp}@saas.com`,
    password: 'Password123#'
};

const unauthorizedUser = {
    name: 'Usuario Sin Permisos',
    email: `intruso_${timestamp}@saas.com`,
    password: 'Password123#'
};

let validToken = ''; 
let invalidToken = ''; 
let testClientId = null;
let testCategoryId = null;
let testProduct1Id = null;
let testProduct2Id = null;
let injectedPermissionId = null;

// ============================================================================
// 2. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Integración: Seguridad, Validación y Transacciones de Ventas', () => {

    // FASE: SETUP (Preparación del Entorno - Caja Gris)
    beforeAll(async () => {
        // A. Permisos obligatorios
        const [permExists] = await pool.query("SELECT id FROM permissions WHERE code = 'sales.create'");
        if (permExists.length === 0) {
            const [newPerm] = await pool.query(
                "INSERT INTO permissions (name, code, description) VALUES ('Crear Ventas', 'sales.create', 'Permiso test')"
            );
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
            email: authorizedUser.email, password: authorizedUser.password
        });
        validToken = authLogin.body.data.accessToken;

        await request(app).post('/api/auth/register').send(unauthorizedUser);
        const unauthLogin = await request(app).post('/api/auth/login').send({
            email: unauthorizedUser.email, password: unauthorizedUser.password
        });
        invalidToken = unauthLogin.body.data.accessToken;

        // C. Creación de Datos Maestros Requeridos
        const [clientRes] = await pool.query(
            "INSERT INTO clients (document_number, name, email) VALUES (?, ?, ?)", 
            [`DOC-${timestamp}`, 'Cliente QA', `qa_${timestamp}@test.com`]
        );
        testClientId = clientRes.insertId;

        const [catRes] = await pool.query("INSERT INTO categories (name, description) VALUES (?, ?)", [`Cat-${timestamp}`, 'Cat QA']);
        testCategoryId = catRes.insertId;

        const [prod1Res] = await pool.query(
            "INSERT INTO products (code, name, price, stock, category_id) VALUES (?, ?, ?, ?, ?)", 
            [`SKU-A-${timestamp}`, 'Producto A', 100.00, 10, testCategoryId]
        );
        testProduct1Id = prod1Res.insertId;

        const [prod2Res] = await pool.query(
            "INSERT INTO products (code, name, price, stock, category_id) VALUES (?, ?, ?, ?, ?)", 
            [`SKU-B-${timestamp}`, 'Producto B', 50.00, 5, testCategoryId]
        );
        testProduct2Id = prod2Res.insertId;
    });

    // FASE: TEARDOWN (Limpieza - Caja Gris)
    afterAll(async () => {
        if (testClientId) {
            await pool.query("DELETE FROM sale_details WHERE sale_id IN (SELECT id FROM sales WHERE client_id = ?)", [testClientId]);
            await pool.query("DELETE FROM sales WHERE client_id = ?", [testClientId]);
        }
        
        if (testProduct1Id) await pool.query("DELETE FROM products WHERE id = ?", [testProduct1Id]);
        if (testProduct2Id) await pool.query("DELETE FROM products WHERE id = ?", [testProduct2Id]);
        if (testCategoryId) await pool.query("DELETE FROM categories WHERE id = ?", [testCategoryId]);
        if (testClientId) await pool.query("DELETE FROM clients WHERE id = ?", [testClientId]);

        if (injectedPermissionId) await pool.query("DELETE FROM role_permissions WHERE permission_id = ?", [injectedPermissionId]);

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

    test('1. [SEGURIDAD - 401] Debe rechazar la petición si NO se envía el token', async () => {
        const payload = { client_id: testClientId, details: [{ product_id: testProduct1Id, quantity: 1 }] };
        const res = await request(app).post('/api/sales').send(payload);
        expect(res.statusCode).toBe(401); 
    });

    test('2. [SEGURIDAD - ROL] Debe rechazar la petición si el usuario NO tiene permisos', async () => {
        const payload = { client_id: testClientId, details: [{ product_id: testProduct1Id, quantity: 1 }] };
        const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${invalidToken}`).send(payload);
        expect([401, 403]).toContain(res.statusCode); 
    });

    test('3. [VALIDACIÓN - 422] Debe denegar la transacción sin cliente válido', async () => {
        const payload = { client_id: null, details: [{ product_id: testProduct1Id, quantity: 1 }] };
        const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${validToken}`).send(payload);
        expect(res.statusCode).toBe(422);
    });

    test('4. [NEGOCIO - 422] Debe denegar la venta si falta stock y verificar inmutabilidad del recurso', async () => {
        const payload = { client_id: testClientId, details: [{ product_id: testProduct1Id, quantity: 50 }] };
        const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${validToken}`).send(payload);
        expect(res.statusCode).toBe(422);
        
        // CORRECCIÓN CAJA NEGRA: Consultamos el producto vía GET para verificar que el stock sigue intacto (10)
        const productRes = await request(app)
            .get(`/api/products/${testProduct1Id}`)
            .set('Authorization', `Bearer ${validToken}`);
            
        expect(productRes.statusCode).toBe(200);
        expect(Number(productRes.body.data.stock)).toBe(10); 
    });

    test('5. [NEGOCIO/ROLLBACK] Debe denegar la transacción si un producto NO existe', async () => {
        const payload = {
            client_id: testClientId,
            details: [{ product_id: 999999, quantity: 1 }]
        };

        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${validToken}`)
            .send(payload);

        expect([404, 422, 500]).toContain(res.statusCode);
        expect(res.body.success).toBe(false);
    });

    test('6. [ÉXITO - 201] Debe procesar la venta, calcular totales y restar inventario (Happy Path)', async () => {
        const payload = {
            client_id: testClientId,
            details: [
                { product_id: testProduct1Id, quantity: 2 }, 
                { product_id: testProduct2Id, quantity: 1 }  
            ]
        };

        // 1. Ejecutamos la venta
        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${validToken}`)
            .send(payload);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        
        const createdSaleId = res.body.data.id; 
        
        // 2. CORRECCIÓN CAJA NEGRA: Validamos el cálculo matemático consultando la venta por GET
        const saleRes = await request(app)
            .get(`/api/sales/${createdSaleId}`)
            .set('Authorization', `Bearer ${validToken}`);
            
        expect(saleRes.statusCode).toBe(200);
        expect(Number(saleRes.body.data.total)).toBe(250); // (2 * 100) + (1 * 50) = 250

        // 3. CORRECCIÓN CAJA NEGRA: Validamos la alteración del stock consultando los productos por HTTP
        const prod1Check = await request(app).get(`/api/products/${testProduct1Id}`).set('Authorization', `Bearer ${validToken}`);
        const prod2Check = await request(app).get(`/api/products/${testProduct2Id}`).set('Authorization', `Bearer ${validToken}`);
        
        expect(Number(prod1Check.body.data.stock)).toBe(8); // 10 - 2 = 8
        expect(Number(prod2Check.body.data.stock)).toBe(4); // 5 - 1 = 4
    });

    test('7. [NEGOCIO/ROLLBACK] Debe denegar la transacción si el client_id NO existe en el sistema', async () => {
        const payload = {
            client_id: 999999, 
            details: [{ product_id: testProduct1Id, quantity: 1 }]
        };

        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${validToken}`)
            .send(payload);

        expect([404, 422, 500]).toContain(res.statusCode);
        expect(res.body.success).toBe(false);
    });     
});