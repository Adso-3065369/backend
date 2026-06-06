/**
 * @file 10-sale.model.test.js
 * @description Suite de Pruebas de Integración Directa - Modelo de Ventas.
 * Valida la construcción dinámica de SQL, agregaciones JSON, Bulk Inserts y operaciones atómicas.
 */

import pool from '../config/db.js';
import { SaleModel } from '../models/sale.model.js';

const timestamp = Date.now();

let testUserId = null;
let testClientId = null;
let testCategoryId = null;
let testProduct1Id = null;
let testProduct2Id = null;
let createdSaleId = null;

describe('Suite de Integración: Modelo de Ventas, Métricas y Transacciones', () => {

    beforeAll(async () => {
        // 1. Inyección de dependencias transaccionales (Usuario y Cliente)
        const [userRes] = await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, 'hash')", 
            [`Cajero ${timestamp}`, `cajero_${timestamp}@saas.com`]
        );
        testUserId = userRes.insertId;

        const [clientRes] = await pool.query(
            "INSERT INTO clients (document_number, name) VALUES (?, ?)", 
            [`DOC-${timestamp}`, `Cliente Venta ${timestamp}`]
        );
        testClientId = clientRes.insertId;

        // 2. Inyección de dependencias de inventario (Categoría y Productos)
        const [catRes] = await pool.query(
            "INSERT INTO categories (name) VALUES (?)", 
            [`Cat Venta ${timestamp}`]
        );
        testCategoryId = catRes.insertId;

        const [prod1Res] = await pool.query(
            "INSERT INTO products (code, name, price, stock, category_id) VALUES (?, ?, 100, 50, ?)", 
            [`SKU-A-${timestamp}`, 'Prod A', testCategoryId]
        );
        testProduct1Id = prod1Res.insertId;

        const [prod2Res] = await pool.query(
            "INSERT INTO products (code, name, price, stock, category_id) VALUES (?, ?, 50, 50, ?)", 
            [`SKU-B-${timestamp}`, 'Prod B', testCategoryId]
        );
        testProduct2Id = prod2Res.insertId;
    });

    afterAll(async () => {
        // Limpieza jerárquica estricta
        if (createdSaleId) {
            await pool.query("DELETE FROM sale_details WHERE sale_id = ?", [createdSaleId]);
            await pool.query("DELETE FROM sales WHERE id = ?", [createdSaleId]);
        }
        if (testProduct1Id || testProduct2Id) {
            await pool.query("DELETE FROM products WHERE id IN (?, ?)", [testProduct1Id, testProduct2Id]);
        }
        if (testCategoryId) await pool.query("DELETE FROM categories WHERE id = ?", [testCategoryId]);
        if (testClientId) await pool.query("DELETE FROM clients WHERE id = ?", [testClientId]);
        if (testUserId) await pool.query("DELETE FROM users WHERE id = ?", [testUserId]);

        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // TRANSACCIONES ATÓMICAS (ESCRITURA)
    // ========================================================================

    test('1. [createHeader & createDetailsBulk] Debe insertar cabecera y detalles usando una conexión externa controlada', async () => {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const total = 250.00;
            createdSaleId = await SaleModel.createHeader(testClientId, testUserId, total, connection);
            
            expect(createdSaleId).toBeGreaterThan(0);

            // Matriz de inserción masiva: [sale_id, product_id, product_name, unit_price, quantity, subtotal]
            const detailsMatrix = [
                [createdSaleId, testProduct1Id, 'Prod A', 100, 2, 200],
                [createdSaleId, testProduct2Id, 'Prod B', 50, 1, 50]
            ];

            await SaleModel.createDetailsBulk(detailsMatrix, connection);
            await connection.commit();

            // Verificación física de escritura
            const [details] = await pool.query("SELECT * FROM sale_details WHERE sale_id = ?", [createdSaleId]);
            expect(details).toHaveLength(2);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    });

    // ========================================================================
    // EXTRACCIÓN Y AGREGACIÓN JSON
    // ========================================================================

    test('2. [findById] Debe retornar la venta con clientes, usuarios y detalles agregados en JSON', async () => {
        const sale = await SaleModel.findById(createdSaleId);

        expect(sale).not.toBeNull();
        expect(sale.id).toBe(createdSaleId);
        expect(Number(sale.total)).toBe(250);

        // Validación de JSON_OBJECT
        expect(sale.client).toHaveProperty('document_number', `DOC-${timestamp}`);
        expect(sale.user).toHaveProperty('name', `Cajero ${timestamp}`);

        // Validación de JSON_ARRAYAGG
        expect(Array.isArray(sale.details)).toBe(true);
        expect(sale.details).toHaveLength(2);
        
        const prodIds = sale.details.map(d => d.product_id);
        expect(prodIds).toContain(testProduct1Id);
        expect(prodIds).toContain(testProduct2Id);
    });

    test('3. [findById] Debe retornar null ante un ID de venta inexistente', async () => {
        const sale = await SaleModel.findById(9999999);
        expect(sale).toBeNull();
    });

    // ========================================================================
    // BÚSQUEDA DINÁMICA
    // ========================================================================

    test('4. [countDynamic & findAllDynamic] Debe procesar filtros y retornar datos relacionales estructurados', async () => {
        const filters = { search: `DOC-${timestamp}`, sortBy: 'total', sortOrder: 'DESC', limit: 5 };

        const totalCount = await SaleModel.countDynamic(filters);
        expect(Number(totalCount)).toBe(1);

        const sales = await SaleModel.findAllDynamic(filters);
        expect(sales).toHaveLength(1);
        expect(sales[0].id).toBe(createdSaleId);
        
        // El resultado debe contener los objetos JSON definidos en la proyección SQL
        expect(typeof sales[0].client).toBe('object');
        expect(typeof sales[0].user).toBe('object');
    });

    // ========================================================================
    // MÉTRICAS Y DASHBOARDS
    // ========================================================================

    test('5. [getSalesStats] Debe retornar la sumatoria histórica de volumen e ingresos', async () => {
        const stats = await SaleModel.getSalesStats();
        
        expect(stats).toHaveProperty('totalSalesCount');
        expect(stats).toHaveProperty('totalSalesRevenue');
        expect(Number(stats.totalSalesCount)).toBeGreaterThanOrEqual(1);
        expect(Number(stats.totalSalesRevenue)).toBeGreaterThanOrEqual(250);
    });

    test('6. [getSalesPerMonth] Debe retornar la facturación agrupada por mes del año en curso', async () => {
        const stats = await SaleModel.getSalesPerMonth();
        
        expect(Array.isArray(stats)).toBe(true);
        expect(stats.length).toBeGreaterThanOrEqual(1);
        
        const currentMonth = new Date().getMonth() + 1;
        const monthData = stats.find(m => Number(m.month) === currentMonth);
        
        expect(monthData).toBeDefined();
        expect(Number(monthData.revenue)).toBeGreaterThanOrEqual(250);
    });

    test('7. [getTopCategories] Debe retornar las categorías respetando el límite y el orden descendente por volumen', async () => {
        // Probamos el método con su comportamiento por defecto (Top 5)
        const topCats = await SaleModel.getTopCategories();
        
        expect(Array.isArray(topCats)).toBe(true);
        expect(topCats.length).toBeGreaterThanOrEqual(1);
        expect(topCats.length).toBeLessThanOrEqual(5); // Valida el truncamiento
        
        // Validación algorítmica: Verificar orden descendente estricto del volumen
        let isSortedDescending = true;
        for (let i = 0; i < topCats.length - 1; i++) {
            if (Number(topCats[i].sales_count) < Number(topCats[i + 1].sales_count)) {
                isSortedDescending = false;
                break;
            }
        }
        
        expect(isSortedDescending).toBe(true);
    });
});