import pool from "../config/db.js";

/**
 * @file seeder.js
 * @description Script de automatización para poblar la base de datos con 
 * clientes, ventas y detalles de venta (Data Seeding).
 * * ADVERTENCIA: Ejecutar solo en entornos de desarrollo.
 */

// Función auxiliar para obtener números aleatorios
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Función auxiliar para generar una fecha aleatoria en lo que va del año (2026)
const getRandomDate = () => {
    const start = new Date(2026, 0, 1); // 1 de Enero de 2026
    const end = new Date(); // Fecha actual
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return randomDate.toISOString().slice(0, 19).replace('T', ' '); // Formato MySQL YYYY-MM-DD HH:MM:SS
};

const runSeeder = async () => {
    console.log("Iniciando siembra de datos (Seeder)...");

    try {
        // 1. OBTENER DATOS MAESTROS (Necesitamos usuarios y productos existentes)
        const [users] = await pool.query("SELECT id FROM users");
        const [products] = await pool.query("SELECT id, name, price FROM products WHERE is_active = 1");

        if (users.length === 0 || products.length === 0) {
            console.error("Error: Debe existir al menos un Usuario y un Producto en la base de datos antes de correr el seeder.");
            process.exit(1);
        }

        // 2. CREACIÓN DE 30 CLIENTES
        console.log("Generando 30 clientes...");
        const clientIds = [];
        
        for (let i = 1; i <= 30; i++) {
            const document = `CC-${getRandomInt(10000000, 99999999)}`;
            const name = `Cliente de Prueba ${i}`;
            const email = `cliente${i}@correo.com`;
            const phone = `300${getRandomInt(1000000, 9999999)}`;

            const [clientResult] = await pool.query(
                "INSERT INTO clients (document_number, name, email, phone) VALUES (?, ?, ?, ?)",
                [document, name, email, phone]
            );
            clientIds.push(clientResult.insertId);
        }

        // 3. CREACIÓN DE VENTAS PARA CADA CLIENTE (Entre 15 y 20 ventas)
        console.log("Generando historial de ventas (Esto puede tomar unos segundos)...");
        let totalSalesGenerated = 0;

        // Bucle secuencial para no ahogar la memoria del servidor
        for (const clientId of clientIds) {
            const numberOfSales = getRandomInt(15, 20);

            for (let j = 0; j < numberOfSales; j++) {
                // Seleccionamos un cajero/usuario al azar
                const randomUser = users[getRandomInt(0, users.length - 1)];
                const saleDate = getRandomDate();

                // a) Seleccionamos cuántos productos distintos llevará esta factura (1 a 3)
                const itemsCount = getRandomInt(1, 3);
                let saleTotal = 0;
                const saleDetails = [];

                // Armamos el carrito de compras simulado
                for (let k = 0; k < itemsCount; k++) {
                    const randomProduct = products[getRandomInt(0, products.length - 1)];
                    const quantity = getRandomInt(1, 4); // Compra entre 1 y 4 unidades
                    const subtotal = randomProduct.price * quantity;
                    
                    saleTotal += subtotal;

                    saleDetails.push([
                        null, // Será el sale_id, lo llenaremos abajo
                        randomProduct.id,
                        randomProduct.name,
                        randomProduct.price,
                        quantity,
                        subtotal
                    ]);
                }

                // b) Insertamos la cabecera de la venta (Transacción simulada)
                const [saleResult] = await pool.query(
                    "INSERT INTO sales (client_id, user_id, total, created_at) VALUES (?, ?, ?, ?)",
                    [clientId, randomUser.id, saleTotal, saleDate]
                );
                
                const newSaleId = saleResult.insertId;

                // c) Actualizamos el sale_id en nuestra matriz de detalles y guardamos
                const finalDetails = saleDetails.map(detail => {
                    detail[0] = newSaleId;
                    return detail;
                });

                await pool.query(
                    `INSERT INTO sale_details 
                    (sale_id, product_id, product_name, unit_price, quantity, subtotal) 
                    VALUES ?`,
                    [finalDetails]
                );

                totalSalesGenerated++;
            }
        }

        console.log(`¡Éxito! Se generaron 30 clientes y un total de ${totalSalesGenerated} facturas de venta.`);

    } catch (error) {
        console.error("Error durante la siembra de datos:", error);
    } finally {
        // Cerramos el pool de conexiones para que el script termine correctamente
        pool.end();
    }
};

// Ejecutamos la función
runSeeder();