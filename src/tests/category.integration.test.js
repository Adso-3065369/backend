/**
 * @file category.integration.test.js
 * @description Suite de Pruebas de Integración - Módulo de Categorías (CRUD Completo)
 * * OBJETIVO: Validar la integridad del ciclo de vida de la entidad Categoría, 
 * desde la persistencia en base de datos hasta la exposición vía API REST,
 * asegurando que el control de acceso (RBAC) y la integridad de datos sean correctos.
 * @author Instructor (John Becerra) - SENA Centro de Comercio y Servicios - Tecnología en Análisis y Desarrollo de Sistemas de Información
 * @version 1.0.0
 * @license MIT
 * @see https://jestjs.io/ - Documentación oficial de Jest
 * @see https://www.npmjs.com/package/supertest - Documentación oficial de Supertest
 */

import dotenv from 'dotenv';
// CRÍTICO: Carga de variables de entorno ANTES de importar la aplicación.
// Si app.js se carga antes, se conectará a la BD de producción.
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../app.js';
import pool from '../config/db.js';
import { UserModel } from '../models/user.model.js';
import { CategoryModel } from '../models/category.model.js';

// IDEMPOTENCIA: Generación de datos únicos mediante timestamps.
// Esto garantiza que la prueba sea ejecutable infinitas veces sin errores 
// de "Unique Constraint" (nombre duplicado) en MySQL.
const testUser = {
    name: 'SENA Inspector CRUD',
    email: `inspector_${Date.now()}@saas.com`,
    password: 'Password123#'
};

const testCategory = {
    name: `Categoría ${Date.now()}`,
    description: 'Descripción de prueba'
};

// ESTADO GLOBAL: variables necesarias para encadenar las pruebas (State Management)
let accessToken = '';
let createdCategoryId = null;

describe('Suite de Integración: CRUD de Categorías', () => {

    // ========================================================================
    // SETUP: Preparación del Entorno
    // ========================================================================
    beforeAll(async () => {
        // 1. Registro inicial vía API: Actuamos como un cliente externo.
        await request(app).post('/api/auth/register').send(testUser);

        // 2. Recuperar ID: Consultamos la BD directamente para saber qué ID asignó MySQL.
        const user = await UserModel.findByEmail(testUser.email);

        // 3. BYPASS DE SEGURIDAD (Elevación de Privilegios):
        // Para probar rutas protegidas, necesitamos permisos. En pruebas de integración, 
        // inyectamos el rol directamente en la BD (Seed) en lugar de intentar 
        // autenticarnos como admin (lo cual causaría una dependencia circular).
        if (user) {
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [user.id, 1]);
        }

        // 4. Autenticación: Obtenemos el token. Este token ya lleva los permisos embebidos.
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        accessToken = loginRes.body.data.accessToken;
    });

    // ========================================================================
    // TEARDOWN: Limpieza (Recolección de Basura)
    // ========================================================================
    afterAll(async () => {
        // 1. Limpieza de Entidad: Borrado físico del recurso creado en el test.
        if (createdCategoryId) {
            await CategoryModel.delete(createdCategoryId);
        }

        // 2. Limpieza de Dependencias: Eliminamos usuario y sus relaciones (Foreign Keys).
        const user = await UserModel.findByEmail(testUser.email);
        if (user) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [user.id]);
            await UserModel.delete(user.id);
        }
        
        // 3. Finalización: Liberar conexiones para evitar procesos colgados (Open Handles).
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // ========================================================================
    // TEST CASES (Caja Blanca: API + Base de Datos)
    // ========================================================================

    test('1. [POST] Debe crear una nueva categoría con rol autorizado', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(testCategory);

        // Aserción API: Status Code 201 (Created)
        expect(res.statusCode).toBe(201);
        createdCategoryId = res.body.data.id;

        // Aserción DB: Verificamos escritura real en disco (Caja Blanca)
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
        
        // Verificación de integridad: Comparamos el estado actual vs el esperado
        const dbVerification = await CategoryModel.findById(createdCategoryId);
        expect(dbVerification.description).toBe('Actualizada');
    });

    test('4. [DELETE] Debe eliminar la categoría', async () => {
        const res = await request(app)
            .delete(`/api/categories/${createdCategoryId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);

        // Verificación de destrucción: El registro ya no debe existir (Undefined)
        const dbVerification = await CategoryModel.findById(createdCategoryId);
        expect(dbVerification).toBeUndefined();
        
        createdCategoryId = null; // Reinicio de estado para evitar errores en post-test
    });
});