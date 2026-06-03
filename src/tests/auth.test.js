/**
 * @file auth.integration.test.js
 * @description Caso de estudio maestro para Pruebas de Integración (API + Base de Datos).
 * Implementa el patrón AAA (Arrange, Act, Assert) y garantiza la idempotencia del entorno.
 * @author Instructor (John Becerra) - SENA Centro de Comercio y Servicios - Tecnología en Análisis y Desarrollo de Sistemas de Información
 * @version 1.0.0
 * @license MIT
 * @see https://jestjs.io/ - Documentación oficial de Jest
 * @see https://www.npmjs.com/package/supertest - Documentación oficial de Supertest
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL ENTORNO (Debe ser la primera ejecución del archivo)
// ============================================================================
import dotenv from 'dotenv';

// INSTRUCCIÓN CRÍTICA: La configuración del entorno (.env.test) debe cargarse 
// ANTES de importar 'app.js'. Si la aplicación se inicializa antes, tomará 
// las variables de producción (.env) y destruirá la base de datos real.
dotenv.config({ path: '.env.test' });

// ============================================================================
// 2. IMPORTACIÓN DE DEPENDENCIAS CORE
// ============================================================================
// Supertest simula un cliente HTTP (como Postman o el navegador) sin necesidad 
// de levantar el servidor en un puerto real. Actúa directamente sobre Express.
import request from 'supertest'; 

// Importamos la instancia de Express sin el 'app.listen()'.
import app from '../app.js'; 

// Importamos el pool de conexiones para inyectar o limpiar datos directamente,
// saltándonos la API. Esto define a una prueba de integración (White Box).
import pool from '../config/db.js'; 
import { UserModel } from '../models/user.model.js';

// ============================================================================
// 3. PREPARACIÓN DE ESTADO AISLADO (Mock Data)
// ============================================================================

// PATRÓN DE IDEMPOTENCIA: Usar un timestamp (`Date.now()`) garantiza que el 
// correo electrónico sea único en cada ejecución (ej. admin_1717374829@saas.com).
// Evita el error SQL de "Duplicate Entry" (Unique Constraint) si el test anterior
// falló y no limpió la base de datos.
const testUser = {
    name: 'SENA Test Admin',
    email: `admin_${Date.now()}@saas.com`,
    password: 'Password123#'
};

// VARIABLE DE ESTADO ENCADENADO: Almacena en memoria RAM el token que devuelve 
// la prueba de Login para inyectarlo en las pruebas de Refresh posteriores.
let validRefreshToken = ''; 

// ============================================================================
// 4. SUITE DE PRUEBAS (Agrupador Lógico)
// ============================================================================
describe('Suite de Integración: Autenticación y Mantenimiento de Sesión', () => {
    
    // ------------------------------------------------------------------------
    // FASE: SETUP (Configuración inicial)
    // ------------------------------------------------------------------------
    beforeAll(async () => {
        // ARRANGE (Preparar): Inyectamos un usuario real a través de la API 
        // de registro. Esto asegura que el Login tenga con qué autenticarse.
        // No asumimos que la base de datos ya tiene usuarios.
        await request(app).post('/api/auth/register').send(testUser);
    });

    // ------------------------------------------------------------------------
    // FASE: TEARDOWN (Limpieza y destrucción)
    // ------------------------------------------------------------------------
    afterAll(async () => {
        // LIMPIEZA ESTRUCTURAL: Un test profesional no deja basura. 
        // Buscamos al usuario que creamos y lo eliminamos físicamente (Hard Delete).
        const user = await UserModel.findByEmail(testUser.email);
        if (user) await UserModel.delete(user.id);
        
        // PREVENCIÓN DE FUGAS DE MEMORIA: Jest no cerrará el proceso si hay 
        // conexiones a la base de datos activas (Error: Open Handles). 
        // Destruimos el pool de MySQL explícitamente.
        if (pool && typeof pool.end === 'function') {
            await pool.end();
        }
    });

    // ========================================================================
    // EJECUCIÓN DE CASOS (Test Cases)
    // ========================================================================

    test('1. [Login] Debe emitir tokens y persistir el hash del refresh_token en la base de datos', async () => {
        
        // ACT (Actuar): Simulamos la petición POST enviando el payload en formato JSON.
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        // ASSERT (Afirmar) - Nivel Red: Validamos el contrato de la API.
        // Exigimos un código 200 (OK) y la existencia estructural de los tokens.
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');

        // EXTRACCIÓN DE ESTADO: Guardamos los datos para las validaciones cruzadas.
        const { id } = res.body.data.user;
        validRefreshToken = res.body.data.refreshToken; // Lo guarda para la prueba 2 y 3.

        // ASSERT (Afirmar) - Nivel Base de Datos: Esto diferencia a un desarrollador 
        // junior de uno mid/senior. No basta con que la API responda bien; 
        // verificamos que la transacción en MySQL realmente escribió el dato.
        const userInDb = await UserModel.findById(id);
        
        expect(userInDb).toBeDefined(); // Verifica que el registro exista.
        expect(userInDb.refresh_token).toBe(validRefreshToken); // Verifica integridad criptográfica.
    });

    test('2. [Refresh - Happy Path] Debe emitir un nuevo access_token al recibir un refresh_token válido', async () => {
        
        // ACT: Ejecuta el endpoint de renovación inyectando la variable de estado
        // (validRefreshToken) que fue poblada exitosamente en la prueba 1.
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: validRefreshToken });

        // ASSERT: Verifica que el backend acepte el token, lo cruce contra la base de datos 
        // y devuelva un nuevo pase VIP (accessToken).
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
    });

    test('3. [Refresh - Unhappy Path] Debe rechazar la transacción (401) si el token es falso o ha sido manipulado', async () => {
        
        // ACT: Ataque deliberado. Se envía un string que simula la estructura JWT 
        // pero que fallará estrepitosamente en la validación criptográfica (jwt.verify).
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.manipulado' });

        // ASSERT: Control de Excepciones. El servidor DEBE bloquear el acceso (401 Unauthorized)
        // y NUNCA debe colapsar arrojando un 500 (Internal Server Error). 
        // Valida la robustez del bloque try/catch en el controlador.
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});