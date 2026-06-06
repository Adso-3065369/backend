/**
 * @file auth.blackbox.test.js
 * @description Caso de estudio para Pruebas de Caja Negra Pura (Black-Box Testing).
 * Interacción exclusiva por HTTP. La limpieza (Teardown) se realiza consumiendo el endpoint real de la API,
 * incorporando el cierre de infraestructura para evitar fugas de memoria.
 */

// ============================================================================
// 1. IMPORTACIONES ESTÁTICAS CORE
// ============================================================================
import request from 'supertest';
import app from '../../app.js';
import pool from '../../config/db.js'; // Compromiso técnico para liberar el proceso en Jest

// ============================================================================
// 2. PREPARACIÓN DE ESTADO AISLADO
// ============================================================================
const testUser = {
    name: 'SENA BlackBox Admin',
    email: `blackbox_${Date.now()}@saas.com`,
    password: 'Password123#'
};

// Variables de estado inter-test para mantener la sesión y el ID
let validRefreshToken = ''; 
let validAccessToken = '';
let createdUserId = ''; // Almacenará el ID retornado por la API

// ============================================================================
// 3. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Caja Negra: Autenticación y Ciclo de Vida por HTTP', () => {
    
    // FASE: SETUP (Registro del usuario de prueba por HTTP)
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        
        expect(res.statusCode).toBe(201);
        
        // Captura del ID del usuario desde la respuesta pública de la API
        if (res.body.data && res.body.data.user) {
            createdUserId = res.body.data.user.id;
        }
    });

    // FASE: TEARDOWN (Limpieza Funcional y Técnica)
    afterAll(async () => {
        // 1. Limpieza de negocio por HTTP (Caja Negra)
        if (createdUserId && validAccessToken) {
            const res = await request(app)
                .delete(`/api/users/${createdUserId}`)
                .set('Authorization', `Bearer ${validAccessToken}`); 
            
            expect([200, 204]).toContain(res.statusCode);
        }

        // 2. Liberación del Event Loop para evitar procesos colgados (Open Handles)
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // ========================================================================
    // EJECUCIÓN DE CASOS DE PRUEBA
    // ========================================================================
    test('1. [Login] Debe emitir tokens de sesión válidos ante credenciales correctas', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');

        // Captura de estado para las pruebas de actualización de sesión
        validRefreshToken = res.body.data.refreshToken;
        validAccessToken = res.body.data.accessToken;
        
        // Recuperación defensiva del ID en caso de que el endpoint de registro no lo devuelva
        if (!createdUserId && res.body.data.user) {
            createdUserId = res.body.data.user.id;
        }
    });

    test('2. [Refresh - Happy Path] Debe emitir un nuevo access_token al recibir un refresh_token válido', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: validRefreshToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
    });

    test('3. [Refresh - Unhappy Path] Debe rechazar la transacción con 401 si el formato del token es manipulado o inválido', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.manipulado' });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});