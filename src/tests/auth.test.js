/**
 * @file auth.integration.test.js
 * @description Caso de estudio maestro para Pruebas de Integración (API + Base de Datos).
 * Implementa el patrón AAA (Arrange, Act, Assert).
 * @author Instructor (John Becerra)
 * @version 1.2.0
 * @license MIT
 */

// ============================================================================
// 1. IMPORTACIONES ESTÁTICAS CORE
// ============================================================================
// La dependencia 'dotenv' ha sido eliminada del código fuente. 
// Jest y cross-env se encargan de pre-cargar .env.test desde la CLI.
import request from 'supertest';
import app from '../app.js';
import pool from '../config/db.js';
import { UserModel } from '../models/user.model.js';

// ============================================================================
// 2. PREPARACIÓN DE ESTADO AISLADO
// ============================================================================
// PATRÓN DE IDEMPOTENCIA
const testUser = {
    name: 'SENA Test Admin',
    email: `admin_${Date.now()}@saas.com`,
    password: 'Password123#'
};

// Variable de estado inter-test
let validRefreshToken = ''; 

// ============================================================================
// 3. SUITE DE PRUEBAS
// ============================================================================
describe('Suite de Integración: Autenticación y Mantenimiento de Sesión', () => {
    
    // FASE: SETUP
    beforeAll(async () => {
        await request(app).post('/api/auth/register').send(testUser);
    });

    // FASE: TEARDOWN
    afterAll(async () => {
        const user = await UserModel.findByEmail(testUser.email);
        if (user) await UserModel.delete(user.id);
        
        // Prevención de Open Handles
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // FASE: EJECUCIÓN (Test Cases)
    test('1. [Login] Debe emitir tokens y persistir el hash del refresh_token en la BD', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');

        const { id } = res.body.data.user;
        validRefreshToken = res.body.data.refreshToken;

        const userInDb = await UserModel.findById(id);
        
        expect(userInDb).toBeDefined();
        expect(userInDb.refresh_token).toBe(validRefreshToken);
    });

    test('2. [Refresh - Happy Path] Debe emitir un nuevo access_token al recibir un refresh_token válido', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: validRefreshToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
    });

    test('3. [Refresh - Unhappy Path] Debe rechazar la transacción (401) si el token es falso', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.manipulado' });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});