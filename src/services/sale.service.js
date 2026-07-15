import pool from "../config/db.js";
import { SaleModel } from '../models/sale.model.js';
import { ProductModel } from '../models/product.model.js';

/**
 * @file sale.service.js
 * @description Capa de negocio para la orquestación de ventas. Coordina transacciones complejas.
 * @quality_attributes
 * - Atomicidad (ACID): Asegura inserciones masivas y descuentos de inventario de forma segura.
 * - Formateo de Datos: Se encarga de transformar las estructuras de MySQL (Strings) a JSON nativo.
 */
export class SaleService {
    
    // ============================================================================
    // 1. FLUJO TRANSACCIONAL (ACID)
    // ============================================================================
    
    /**
     * @description Procesa una venta completa asegurando integridad de inventario y base de datos.
     * @param {number} clientId - Identificador del cliente.
     * @param {number} userId - Identificador del usuario/cajero.
     * @param {Array} details - Arreglo de productos a facturar.
     * @throws {Error} Si el stock es insuficiente o el producto no existe.
     * @returns {Promise<Object>} Resumen de la transacción exitosa.
     */
    static async processSale(clientId, userId, details) {
        const connection = await pool.getConnection();        
        
        try {
            await connection.beginTransaction();

            let saleTotal = 0;
            const verifiedDetails = [];

            // 1. Validación de reglas de negocio
            for (const item of details) {
                const product = await ProductModel.findByIdForTransaction(item.product_id, connection);
                
                // 1. Validación de existencia
                if (!product) {
                    const err = new Error(`El producto con ID ${item.product_id} no existe.`);
                    err.statusCode = 404; // Not Found
                    throw err;
                }
                // 2. Validación de reglas de negocio (Stock)
                if (product.stock < item.quantity) {
                    const err = new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`);
                    err.statusCode = 422; // Unprocessable Entity
                    throw err;
                }
                const subtotal = item.quantity * product.price;
                saleTotal += subtotal;

                verifiedDetails.push({
                    product_id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: item.quantity,
                    subtotal
                });
            }            

            // 2. Creación de la cabecera
            const saleId = await SaleModel.createHeader(clientId, userId, saleTotal, connection);

            // 3. Preparación de matriz masiva
            const bulkDetailsArray = verifiedDetails.map(item => [
                saleId,
                item.product_id,
                item.name,      
                item.price,      
                item.quantity,
                item.subtotal
            ]);

            // 4. Inserción masiva real (Una sola llamada a la BD)
            await SaleModel.createDetailsBulk(bulkDetailsArray, connection);

            // 5. Descuento de inventario iterativo
            for (const detail of verifiedDetails) {
                await ProductModel.decrementStock(detail.product_id, detail.quantity, connection);
            }

            await connection.commit();

            return { 
                id: saleId, 
                client_id: clientId, 
                total: saleTotal, 
                items_processed: verifiedDetails.length 
            };

        } catch (error) {
            await connection.rollback();
            throw error; 
        } finally {
            connection.release();
        }
    }

    // ============================================================================
    // 2. CONSULTAS Y LECTURAS (Parseo Dinámico)
    // ============================================================================

    /**
     * @description Obtiene el historial de ventas adaptándose a los requerimientos de paginación.
     * @param {Object} filters - Diccionario de parámetros de URL.
     * @returns {Promise<Object|Array>} Estructura paginada o arreglo plano.
     */
    static async getSalesList(filters) {
        // Función auxiliar para parsear los JSON integrados por MySQL
        const parseRow = (row) => ({
            ...row,
            client: typeof row.client === 'string' ? JSON.parse(row.client) : row.client,
            user: typeof row.user === 'string' ? JSON.parse(row.user) : row.user
        });

        // 1. Modo Plano
        if (String(filters.paginate) === 'false') {
            const rawSales = await SaleModel.findAllDynamic(filters);
            return rawSales.map(parseRow);
        }

        // 2. Modo Paginado Estándar
        const limit = Number(filters.limit) || 10;
        const page = Number(filters.page) || 1;
        const offset = (page - 1) * limit;

        filters.limit = limit;
        filters.offset = offset;

        const [totalItems, rawSales] = await Promise.all([
            SaleModel.countDynamic(filters),
            SaleModel.findAllDynamic(filters)
        ]);
        
        const totalPages = Math.ceil(totalItems / limit);
        const parsedSales = rawSales.length === 0 ? [] : rawSales.map(parseRow);

        return {
            data: parsedSales,
            meta: {
                currentPage: page,
                lastPage: totalPages,
                itemsPerPage: limit,
                totalItems: totalItems,
                nextPage: page < totalPages ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null
            }
        };
    }

    /**
     * @description Extrae y formatea una venta mediante su ID.
     * @param {number} id - Identificador de la venta.
     * @returns {Promise<Object|null>} Objeto venta estructurado.
     */
    static async getSaleById(id) {
        const rawSale = await SaleModel.findById(id);
        
        if (!rawSale) return null;

        return {
            ...rawSale,
            client: typeof rawSale.client === 'string' ? JSON.parse(rawSale.client) : rawSale.client,
            user: typeof rawSale.user === 'string' ? JSON.parse(rawSale.user) : rawSale.user,
            details: typeof rawSale.details === 'string' 
                ? JSON.parse(rawSale.details).filter(detail => detail.id !== null) 
                : rawSale.details
        };
    }
}