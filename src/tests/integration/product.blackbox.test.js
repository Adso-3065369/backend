/**
 * @file product.blackbox.test.js
 * @description Suite de Pruebas de Integración Unificada - Catálogo de Productos (Caja Negra Pura).
 * Orquesta la validación de consultas indexadas, paginación matemática, filtros complejos,
 * sanitización contra inyecciones SQL y operaciones de mutación CRUD vía HTTP.
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
    name: 'Admin Productos',
    email: `admin_prod_${timestamp}@saas.com`,
    password: 'Password123#'
};

const unauthorizedUser = {
    name: 'Usuario Sin Permisos',
    email: `intruso_prod_${timestamp}@saas.com`,
    password: 'Password123#'
};

let validToken = ''; 
let invalidToken = ''; 
let injectedPermissionIds = [];

let category1Id = null;
let category2Id = null;
let testProductIds = [];

// ============================================================================
// 2. SUITE DE PRUEBAS UNIFICADA
// ============================================================================
describe('Suite de Integración: Control de Acceso, Filtros Masivos y Mutaciones de Productos', () => {

    // FASE: SETUP (Preparación e Inyección de Masa de Datos - Caja Gris)
    beforeAll(async () => {
        // A. Inyección de Permisos Requeridos en el Rol Administrativo ('products.index' y 'products.update')
        const permissionsToInsert = [
            { code: 'products.index', name: 'Listar Productos' },
            { code: 'products.update', name: 'Editar Productos' }
        ];

        for (const perm of permissionsToInsert) {
            const [permExists] = await pool.query("SELECT id FROM permissions WHERE code = ?", [perm.code]);
            let pId;
            if (permExists.length === 0) {
                const [newPerm] = await pool.query("INSERT INTO permissions (name, code) VALUES (?, ?)", [perm.name, perm.code]);
                pId = newPerm.insertId;
            } else {
                pId = permExists[0].id;
            }
            injectedPermissionIds.push(pId);
            await pool.query("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [pId]);
        }

        // B. Registro y Autenticación de Usuarios de Control vía HTTP
        await request(app).post('/api/auth/register').send(authorizedUser);
        const authUserRecord = await UserModel.findByEmail(authorizedUser.email);
        if (authUserRecord) {
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, 1)", [authUserRecord.id]);
        }
        const authLogin = await request(app).post('/api/auth/login').send({ email: authorizedUser.email, password: authorizedUser.password });
        validToken = authLogin.body.data.accessToken;

        await request(app).post('/api/auth/register').send(unauthorizedUser);
        const unauthLogin = await request(app).post('/api/auth/login').send({ email: unauthorizedUser.email, password: unauthorizedUser.password });
        invalidToken = unauthLogin.body.data.accessToken;

        // C. Data Seeding: Creación de Categorías base
        const [cat1] = await pool.query("INSERT INTO categories (name) VALUES (?)", [`Electrónica ${timestamp}`]);
        category1Id = cat1.insertId;
        const [cat2] = await pool.query("INSERT INTO categories (name) VALUES (?)", [`Aseo ${timestamp}`]);
        category2Id = cat2.insertId;

        // D. Data Seeding: Inserción de 15 productos con variaciones de negocio para forzar algoritmos
        const productPromises = [];
        for (let i = 1; i <= 15; i++) {
            let name, code, price, stock, catId, isActive;

            if (i === 1) {
                // Producto ancla para test de búsqueda, ordenamiento y mutación por PUT
                name = `Zapato Especial ADSO ${timestamp}`;
                code = `SKU-ZAP-${timestamp}`;
                price = 9999.99; 
                stock = 0;
                catId = category2Id;
                isActive = 0;
            } else {
                name = `Producto Paginacion ${timestamp} - ${String.fromCharCode(64 + i)}`; 
                code = `SKU-GEN-${timestamp}-${i}`;
                price = 10.00 * i;
                stock = 100;
                catId = category1Id;
                isActive = 1;
            }
            
            productPromises.push(
                pool.query(
                    "INSERT INTO products (code, name, price, stock, category_id, is_active) VALUES (?, ?, ?, ?, ?, ?)", 
                    [code, name, price, stock, catId, isActive]
                )
            );
        }
        
        const results = await Promise.all(productPromises);
        testProductIds = results.map(res => res[0].insertId);
    });

    // FASE: TEARDOWN (Limpieza y purga absoluta de base de datos)
    afterAll(async () => {
        if (testProductIds.length > 0) {
            const placeholders = testProductIds.map(() => '?').join(',');
            await pool.query(`DELETE FROM products WHERE id IN (${placeholders})`, testProductIds);
        }
        if (category1Id) await pool.query("DELETE FROM categories WHERE id = ?", [category1Id]);
        if (category2Id) await pool.query("DELETE FROM categories WHERE id = ?", [category2Id]);
        
        for (const pId of injectedPermissionIds) {
            await pool.query("DELETE FROM role_permissions WHERE permission_id = ?", [pId]);
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
    // BLOQUE 1: EXTRACCIÓN, FILTROS Y SEGURIDAD (CAJA NEGRA)
    // ========================================================================

    test('1. [SEGURIDAD] Debe rechazar la petición sin token o con privilegios insuficientes', async () => {
        const resNoToken = await request(app).get('/api/products');
        expect(resNoToken.statusCode).toBe(401);

        const resNoPerm = await request(app).get('/api/products').set('Authorization', `Bearer ${invalidToken}`);
        expect([401, 403]).toContain(resNoPerm.statusCode);
    });

    test('2. [PAGINACIÓN - DEFAULT] Debe retornar la primera página limitada matemáticamente a 10 registros', async () => {
        const res = await request(app).get('/api/products').set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.data.length).toBeLessThanOrEqual(10);
        expect(res.body.data.meta.currentPage).toBe(1);
    });

    test('3. [MODO PLANO] Debe retornar un array plano directo omitiendo metadata si paginate=false', async () => {
        const res = await request(app).get('/api/products?paginate=false').set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).not.toHaveProperty('meta');
    });

    test('4. [FILTRO - BÚSQUEDA] Debe aplicar cláusulas de coincidencia parcial (LIKE) sobre el catálogo', async () => {
        const searchTerm = `Zapato Especial ADSO ${timestamp}`;
        const res = await request(app).get(`/api/products?search=${encodeURIComponent(searchTerm)}`).set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.data.length).toBe(1);
        expect(res.body.data.data[0].name).toBe(searchTerm);
    });

    test('5. [FILTRO - BOOLEAN] Debe aislar los registros evaluando de forma estricta el estado lógico', async () => {
        const res = await request(app).get('/api/products?is_active=0').set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        const inactiveProducts = res.body.data.data;
        const allAreInactive = inactiveProducts.every(p => p.is_active === 0);
        expect(allAreInactive).toBe(true);
    });

    test('6. [FILTRO - FOREIGN KEY] Debe segmentar el catálogo basándose en la relación de categorías', async () => {
        const res = await request(app).get(`/api/products?category_id=${category2Id}`).set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        const categoryProducts = res.body.data.data;
        expect(categoryProducts.length).toBeGreaterThan(0);
        const allMatchCategory = categoryProducts.every(p => p.category_id === category2Id);
        expect(allMatchCategory).toBe(true);
    });

    test('7. [ORDENAMIENTO] Debe estructurar la respuesta respetando la ordenación dinámica de columnas', async () => {
        const res = await request(app)
            .get('/api/products?sortBy=price&sortOrder=DESC')
            .set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        const products = res.body.data.data;
        expect(products.length).toBeGreaterThan(1);
        
        let isSorted = true;
        for (let i = 0; i < products.length - 1; i++) {
            if (Number(products[i].price) < Number(products[i + 1].price)) {
                isSorted = false;
                break;
            }
        }
        expect(isSorted).toBe(true);
    });

    test('8. [ORDENAMIENTO - SANITIZACIÓN] Debe interceptar intentos de inyección SQL y aplicar fallback estructural', async () => {
        const res = await request(app).get('/api/products?sortBy=INJECT_SQL_DROP_TABLE_OR_BOOLEAN').set('Authorization', `Bearer ${validToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true); // El sistema aplica fallback seguro sin arrojar excepciones críticas
    });

    // ========================================================================
    // BLOQUE 2: MUTACIONES DE NEGOCIO - PUT (CAJA NEGRA)
    // ========================================================================

    test('9. [PUT] Debe actualizar el recurso de forma integral y reflejar los cambios vía GET', async () => {
        const targetProductId = testProductIds[0]; // Usamos el ID del primer producto inyectado
        
        const updatePayload = {
            code: `SKU-UP-${timestamp}`, 
            name: 'Producto Modificado por Tubería HTTP',
            price: 185.50,
            stock: 450,
            category_id: category1Id // Transferencia de categoría válida
        };

        // Act: Ejecutamos la mutación por HTTP
        const putResponse = await request(app)
            .put(`/api/products/${targetProductId}`)
            .set('Authorization', `Bearer ${validToken}`)
            .send(updatePayload);

        expect(putResponse.statusCode).toBe(200);

        // Assert (Caja Negra Pura): Volvemos a consumir el recurso por GET para auditar los cambios reales
        const verifyResponse = await request(app)
            .get(`/api/products/${targetProductId}`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(verifyResponse.statusCode).toBe(200);
        expect(verifyResponse.body.data.name).toBe(updatePayload.name);
        expect(Number(verifyResponse.body.data.price)).toBe(185.50);
        expect(Number(verifyResponse.body.data.stock)).toBe(450);
        expect(verifyResponse.body.data.category_id).toBe(updatePayload.category_id);
    });

    test('10. [PUT - 404] Debe responder con la excepción semántica adecuada si el identificador no existe', async () => {
        const fallbackPayload = {
            code: 'SKU-INEXISTENTE',
            name: 'Objeto Fantasma',
            price: 50.00,
            stock: 10,
            category_id: category1Id
        };

        const res = await request(app)
            .put('/api/products/999999') // ID fuera del rango relacional
            .set('Authorization', `Bearer ${validToken}`)
            .send(fallbackPayload);

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });
});