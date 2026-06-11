/**
 * @file category.blackbox.test.js
 * @description Suite de Pruebas de Integración - CRUD de Categorías (Enfoque de Caja Gris Controlada)
 */

import request from 'supertest';
import app from '../../app.js';
import pool from '../../config/db.js'; // Importamos el pool exclusivamente para preparar el escenario
import { UserModel } from '../../models/user.model.js'; // Usado solo en SETUP y TEARDOWN

const testUser = {
    name: 'SENA Inspector CRUD',
    email: `inspector_${Date.now()}@saas.com`,
    password: 'Password123#'
};

const testCategory = {
    name: `Categoría ${Date.now()}`,
    description: 'Descripción de prueba'
};

let accessToken = '';
let createdCategoryId = null;
let createdUserId = null; // Guardamos el ID del usuario para limpiarlo al final

describe('Suite de Integración: CRUD de Categorías', () => {

    // FASE: SETUP (Preparamos el usuario y le inyectamos los poderes)
    beforeAll(async () => {
        // 1. Registro del usuario por HTTP (Caja Negra)
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        
        expect(registerRes.statusCode).toBe(201);

        // 2. Recuperamos el ID que la base de datos le asignó (Caja Blanca/Gris)
        const user = await UserModel.findByEmail(testUser.email);
        if (user) {
            createdUserId = user.id;

            // 3. ELEVACIÓN DE PRIVILEGIOS: Inyectamos la relación del rol administrativo (ej: ID 1)
            // Asegúrate de que en tu tabla 'roles', el ID 1 corresponda al rol con permisos para categorías
            await pool.query(
                "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", 
                [createdUserId, 1]
            );
        }

        // 4. Login por HTTP. Al haber inyectado el rol en el paso anterior, 
        // el accessToken generado ahora sí contendrá los permisos necesarios.
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });
        
        expect(loginRes.statusCode).toBe(200);
        accessToken = loginRes.body.data.accessToken;
    });

    // FASE: TEARDOWN (Limpieza absoluta del entorno para no dejar basura)
    afterAll(async () => {
        // 1. Limpieza de la categoría por HTTP (Si quedó huérfana)
        if (createdCategoryId && accessToken) {
            await request(app)
                .delete(`/api/categories/${createdCategoryId}`)
                .set('Authorization', `Bearer ${accessToken}`);
        }

        // 2. Limpieza de relaciones de usuario y borrado (Caja Gris)
        if (createdUserId) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [createdUserId]);
            await UserModel.delete(createdUserId);
        }
        
        // 3. Cierre del pool para evitar 'Open Handles' en Jest
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // ========================================================================
    // FLUJO DE EJECUCIÓN (HTTP PURO - CAJA NEGRA DESDE AQUÍ EN ADELANTE)
    // ========================================================================
    test('1. [POST] Debe crear una nueva categoría con el token autorizado', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(testCategory);

        expect(res.statusCode).toBe(201);
        expect(res.body.data).toHaveProperty('id');
        
        createdCategoryId = res.body.data.id; // Guardamos el ID para los siguientes pasos
    });

    test('2. [GET] Debe recuperar de forma efectiva la categoría creada', async () => {
        const res = await request(app)
            .get(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.name).toBe(testCategory.name);
    });

    test('3. [PUT] Debe permitir la actualización parcial de los campos', async () => {
        const updatedData = { 
            name: testCategory.name, 
            description: 'Nueva descripción modificada' 
        };

        const res = await request(app)
            .put(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send(updatedData);

        expect(res.statusCode).toBe(200);

        // Verificación por HTTP
        const verify = await request(app)
            .get(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(verify.body.data.description).toBe('Nueva descripción modificada');
    });

    test('4. [DELETE] Debe eliminar la categoría y denegar accesos futuros', async () => {
        const res = await request(app)
            .delete(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);

        // Verificación de desaparición por HTTP
        const verifyNotFound = await request(app)
            .get(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(verifyNotFound.statusCode).toBe(404);
        
        createdCategoryId = null; // Estado limpio
    });
});