import pool from './config/db.js';

const run = async () => {
    try {
        console.log('Iniciando script de permisos...');

        // 1. Insertar el permiso
        await pool.query(`
            INSERT IGNORE INTO permissions (name, code, description) 
            VALUES ('Actualizar Configuración', 'config.update', 'Permite cambiar IVA y datos del negocio')
        `);
        console.log('Permiso "config.update" creado o ya existía.');

        // 2. Obtener el ID del permiso recién creado
        const [rows] = await pool.query(`SELECT id FROM permissions WHERE code = 'config.update'`);
        const permissionId = rows[0].id;

        // 3. Asignarlo al rol Administrador (suponiendo que el Admin es el role_id = 1)
        await pool.query(`
            INSERT IGNORE INTO role_permissions (role_id, permission_id) 
            VALUES (1, ?)
        `, [permissionId]);
        
        console.log('Permiso asignado al rol Admin (ID: 1) correctamente.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

run();
