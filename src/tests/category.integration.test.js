/**
 * @file category.integration.test.js
 * @description Suite de Pruebas de Integración - Módulo de Categorías (CRUD Completo)
 * OBJETIVO: Validar la integridad del ciclo de vida de la entidad Categoría, 
 * desde la persistencia en base de datos hasta la exposición vía API REST,
 * asegurando que el control de acceso (RBAC) y la integridad de datos sean correctos.
 * @author Instructor (John Becerra)
 * @version 1.1.0
 * @license MIT
 */

// ============================================================================
// 1. IMPORTACIONES ESTÁTICAS CORE
// ============================================================================
// La dependencia 'dotenv' ha sido eliminada. El entorno (.env.test) es inyectado
// externamente vía CLI mediante cross-env y Jest.
import request from 'supertest';
import app from '../app.js';
import pool from '../config/db.js';
import { UserModel } from '../models/user.model.js';
import { CategoryModel } from '../models/category.model.js';

// ============================================================================
// 2. PREPARACIÓN DE ESTADO AISLADO
// ============================================================================
// IDEMPOTENCIA: Generación de datos únicos mediante timestamps para evitar 
// colisiones de Unique Constraint en ejecuciones consecutivas.
const testUser = {
    name: 'SENA Inspector CRUD',
    email: `inspector_${Date.now()}@saas.com`,
    password: 'Password123#'
};

const testCategory = {
    name: `Categoría ${Date.now()}`,
    description: 'Descripción de prueba'
};

// ESTADO GLOBAL: variables necesarias para encadenar las pruebas.
let accessToken = '';
let createdCategoryId = null;

// ============================================================================
// 3. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Integración: CRUD de Categorías', () => {

    // FASE: SETUP
    beforeAll(async () => {
        // 1. Registro inicial vía API.
        await request(app).post('/api/auth/register').send(testUser);

        // 2. Recuperar ID insertado.
        const user = await UserModel.findByEmail(testUser.email);

        // 3. BYPASS DE SEGURIDAD (Elevación de Privilegios):
        // Inyectamos el rol directamente en la BD para evitar dependencias circulares.
        if (user) {
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [user.id, 1]);
        }

        // 4. Autenticación y extracción de token con permisos embebidos.
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        accessToken = loginRes.body.data.accessToken;
    });

    // FASE: TEARDOWN
    afterAll(async () => {
        // 1. Limpieza de Entidad: Borrado físico del recurso creado en el test.
        if (createdCategoryId) {
            await CategoryModel.delete(createdCategoryId);
        }

        // 2. Limpieza de Dependencias: Eliminamos usuario y sus relaciones.
        const user = await UserModel.findByEmail(testUser.email);
        if (user) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [user.id]);
            await UserModel.delete(user.id);
        }
        
        // 3. Finalización: Prevención de Open Handles.
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // FASE: EJECUCIÓN (Test Cases - Caja Blanca)
    test('1. [POST] Debe crear una nueva categoría con rol autorizado', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(testCategory);

        expect(res.statusCode).toBe(201);
        createdCategoryId = res.body.data.id;

        // Aserción DB: Verificación de escritura real.
        const dbVerification = await CategoryModel.findById(createdCategoryId);
        expect(dbVerification.name).toBe(testCategory.name);
    });

    test('2. [GET] Debe recuperar la categoría creada', async () => {
        const res = await request(app)
            .get(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(createdCategoryId);
    });

    test('3. [PUT] Debe actualizar la categoría', async () => {
        const updatedData = { ...testCategory, description: 'Actualizada' };

        const res = await request(app)
            .put(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send(updatedData);

        expect(res.statusCode).toBe(200);
        
        // Verificación de integridad estructural.
        const dbVerification = await CategoryModel.findById(createdCategoryId);
        expect(dbVerification.description).toBe('Actualizada');
    });

    test('4. [DELETE] Debe eliminar la categoría', async () => {
        const res = await request(app)
            .delete(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);

        // Verificación de destrucción en BD.
        const dbVerification = await CategoryModel.findById(createdCategoryId);
        expect(dbVerification).toBeUndefined();
        
        createdCategoryId = null; // Reinicio de estado.
    });
});