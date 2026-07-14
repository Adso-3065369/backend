import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import "dotenv/config";

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "persistencia_v1",
  password: process.env.DB_PASSWORD || "mi_sena123",
  database: process.env.DB_NAME || "v1_users",
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true,
};

async function main() {
  console.log("Iniciando la migración e inicialización de la base de datos...");
  console.log(`Conectando a MySQL en ${dbConfig.host}:${dbConfig.port} como ${dbConfig.user}...`);

  // Primero nos conectamos sin seleccionar base de datos, para poder crearla si no existe
  const connectionWithoutDb = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
    multipleStatements: true,
  });

  try {
    const dbName = dbConfig.database;
    console.log(`Asegurando que la base de datos '${dbName}' exista...`);
    await connectionWithoutDb.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Base de datos '${dbName}' verificada/creada.`);
  } finally {
    await connectionWithoutDb.end();
  }

  // Ahora nos conectamos seleccionando la base de datos
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. Cargar y ejecutar el esquema
    console.log("Leyendo archivo de esquema SQL...");
    let schemaSql = await fs.readFile(
      path.join("scripts", "schema_inventario_adso.sql"),
      "utf-8"
    );

    // Ajustar el script de esquema para que use la base de datos configurada en vez de inventario_adso
    schemaSql = schemaSql.replace(/inventario_adso/g, dbConfig.database);

    console.log("Aplicando esquema de tablas...");
    await connection.query(schemaSql);
    console.log("Esquema aplicado exitosamente.");

    // 2. Cargar y ejecutar permisos
    console.log("Aplicando permisos semilla...");
    const permissionsSql = await fs.readFile(
      path.join("scripts", "seed_permissions.sql"),
      "utf-8"
    );
    await connection.query(permissionsSql);
    console.log("Permisos semilla aplicados exitosamente.");

    // 3. Cargar y ejecutar roles y permisos de rol
    console.log("Aplicando roles semilla...");
    const rolesSql = await fs.readFile(
      path.join("scripts", "seed_roles.sql"),
      "utf-8"
    );
    await connection.query(rolesSql);
    console.log("Roles semilla aplicados exitosamente.");

    // 4. Cargar y ejecutar inventario (Categorías y productos)
    console.log("Aplicando categorías y productos semilla...");
    const inventarioSql = await fs.readFile(
      path.join("scripts", "seed_inventario.sql"),
      "utf-8"
    );
    await connection.query(inventarioSql);
    console.log("Categorías y productos semilla aplicados exitosamente.");

    // 5. Crear usuario Admin semilla
    console.log("Creando usuario administrador semilla...");
    const adminEmail = "admin@example.com";
    const adminPassword = "adminpassword123";
    
    // Verificamos si ya existe
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail]
    );

    let adminUserId;
    if (existingUsers.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      const [insertResult] = await connection.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        ["Administrador Semilla", adminEmail, hashedPassword]
      );
      adminUserId = insertResult.insertId;
      console.log(`Usuario administrador creado con ID: ${adminUserId}`);
    } else {
      adminUserId = existingUsers[0].id;
      console.log(`Usuario administrador ya existe con ID: ${adminUserId}`);
    }

    // Asignar rol Admin (ID 1)
    await connection.query(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [adminUserId, 1]
    );
    console.log(`Rol Admin (ID 1) asignado al usuario administrador (ID ${adminUserId}).`);

    console.log("\n=======================================================");
    console.log("¡Inicialización de Base de Datos completada con éxito!");
    console.log("Credenciales de administrador para Postman:");
    console.log(`  - Email:    ${adminEmail}`);
    console.log(`  - Password: ${adminPassword}`);
    console.log("=======================================================\n");

  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
