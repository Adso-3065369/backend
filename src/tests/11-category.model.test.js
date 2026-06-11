/**
 * @file 11-category.model.test.js
 * @description Suite de Pruebas de Integración Directa - Modelo de Categorías.
 * Expone vulnerabilidades de tipos de datos (BigInt) y violaciones de integridad referencial.
 */

import pool from '../config/db.js';
import { CategoryModel } from '../models/category.model.js';

const timestamp = Date.now();

let emptyCatId = null;
let populatedCatId = null;
let testProductId = null;

describe('Suite de Integración: Modelo de Categorías', () => {

    beforeAll(async () => {
        // 1. Categoría vacía
        const [emptyRes] = await pool.query("INSERT INTO categories (name, description) VALUES (?, ?)", [`Vacia ${timestamp}`, 'Sin productos']);
        emptyCatId = emptyRes.insertId;

        // 2. Categoría con dependencia (con un producto atado)
        const [popRes] = await pool.query("INSERT INTO categories (name, description) VALUES (?, ?)", [`Ocupada ${timestamp}`, 'Con productos']);
        populatedCatId = popRes.insertId;

        const [prodRes] = await pool.query(
            "INSERT INTO products (code, name, price, stock, category_id) VALUES (?, ?, 10, 10, ?)", 
            [`SKU-CAT-${timestamp}`, 'Prod Cat Test', populatedCatId]
        );
        testProductId = prodRes.insertId;
    });

    afterAll(async () => {
        // Limpieza controlada
        if (testProductId) await pool.query("DELETE FROM products WHERE id = ?", [testProductId]);
        if (populatedCatId) await pool.query("DELETE FROM categories WHERE id = ?", [populatedCatId]);
        if (emptyCatId) await pool.query("DELETE FROM categories WHERE id = ?", [emptyCatId]);
        
        if (pool && typeof pool.end === 'function') await pool.end();
    });

    // ========================================================================
    // LECTURAS Y AGREGACIONES SQL
    // ========================================================================

    test('1. [findAllDynamic & findById] Debe castear correctamente product_count y mapear has_products a Boolean', async () => {
        const cat = await CategoryModel.findById(populatedCatId);
        
        expect(cat).toBeDefined();
        expect(typeof cat.product_count).not.toBe('bigint');
        expect(Number(cat.product_count)).toBe(1);
        
        // CORRECCIÓN: Uso del método válido en Jest para primitivos
        expect(cat.has_products).toBe(true);

        const emptyCat = await CategoryModel.findById(emptyCatId);
        expect(Number(emptyCat.product_count)).toBe(0);
        expect(emptyCat.has_products).toBe(false);
    });

    test('2. [countDynamic] Debe retornar el conteo preciso aplicando filtros de búsqueda', async () => {
        const total = await CategoryModel.countDynamic({ search: `Vacia ${timestamp}` });
        expect(Number(total)).toBe(1);
    });

    test('3. [findAllDynamic] Debe ordenar dinámicamente por campos agregados (product_count)', async () => {
        const filters = { sortBy: 'product_count', sortOrder: 'DESC', limit: 10 };
        const results = await CategoryModel.findAllDynamic(filters);
        
        expect(results.length).toBeGreaterThan(0);
        // El primer elemento debe tener un product_count mayor o igual al segundo
        expect(Number(results[0].product_count)).toBeGreaterThanOrEqual(Number(results[1]?.product_count || 0));
    });

    // ========================================================================
    // ESCRITURAS Y MANEJO DE INTEGRIDAD REFERENCIAL
    // ========================================================================

    test('4. [create] Debe insertar y retornar la categoría estandarizada', async () => {
        const payload = { name: `Nueva ${timestamp}`, description: 'Desc' };
        const newCat = await CategoryModel.create(payload);
        
        expect(newCat).toBeDefined();
        expect(newCat.name).toBe(payload.name);
        expect(newCat.has_products).toBe(false);

        // Limpieza de este registro específico
        await pool.query("DELETE FROM categories WHERE id = ?", [newCat.id]);
    });

    test('5. [update] Debe modificar los campos mutables', async () => {
        const payload = { name: `Actualizada ${timestamp}`, description: 'Editada' };
        const updated = await CategoryModel.update(emptyCatId, payload);
        
        expect(updated.name).toBe(payload.name);
        expect(updated.description).toBe(payload.description);
    });

    test('6. [delete] Debe eliminar físicamente una categoría huérfana (sin dependencias)', async () => {
        // Insertamos una temporal para borrar
        const [temp] = await pool.query("INSERT INTO categories (name) VALUES (?)", [`Borrar ${timestamp}`]);
        const tempId = temp.insertId;

        const isDeleted = await CategoryModel.delete(tempId);
        expect(isDeleted).toBe(true);

        const check = await CategoryModel.findById(tempId);
        expect(check).toBeUndefined();
    });

    test('7. [delete - FK CONSTRAINT] Debe fallar con un error de negocio controlado si se intenta borrar una categoría con productos atados', async () => {
        // CORRECCIÓN: Aserción alineada con la excepción controlada del modelo
        await expect(CategoryModel.delete(populatedCatId))
            .rejects
            .toThrow("No es posible eliminar la categoría porque tiene productos vinculados.");
    });
});