import pool from "../config/db.js";

export const RoleModel = {
  // 1. Obtener todas los roles
  findAll: async () => {
    // Solo trae los roles puros
    const [rows] = await pool.query("SELECT * FROM roles");
    return rows;
  },
  // 2. Obtener un rol por su ID
  findById: async (id) => {
    // Retorna el rol si existe, o undefined si no lo encuentra
    const [rows] = await pool.query("SELECT * FROM roles WHERE id = ?", [id]);
    return rows[0] || null;
  },
  // 3. Crear un nuevo rol en la tabla 'roles'
  create: async (roleData) => {
    const { name, description, permissionIds } = roleData;
    const connection = await pool.getConnection(); // Pedimos conexión exclusiva

    try {
        await connection.beginTransaction(); // Iniciamos la transacción

        // Paso A: Insertar el rol maestro
        const [result] = await connection.query(
            "INSERT INTO roles (name, description) VALUES (?, ?)",
            [name, description || null]
        );
        
        // CAPTURAMOS EL ID GENERADO POR MYSQL
        const newRoleId = result.insertId;

        // Paso B: Insertar los permisos vinculados a ese nuevo ID
        if (permissionIds && permissionIds.length > 0) {
            // Preparamos la matriz de valores: [[nuevoId, permiso1], [nuevoId, permiso2]]
            const values = permissionIds.map(permId => [newRoleId, permId]);
            
            await connection.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [values]
            );
        }

        await connection.commit(); // Confirmamos los cambios
        return newRoleId; // Retornamos el ID para que el servicio lo use

    } 
    
    catch (error) {
        await connection.rollback(); // Deshacemos todo si hay un fallo
        throw error;
    } 
    
    finally {
        connection.release(); // Liberamos la conexión
    }
},

  // 4. Actualizar un rol existente (con manejo de permisos)
  update: async (id, roleData) => {
        const { name, description, permissionIds } = roleData;
        const connection = await pool.getConnection(); // 1. Solicitamos conexión exclusiva

        try {
            await connection.beginTransaction(); // 2. Iniciamos la transacción

            // Paso A: Actualizar los datos maestros del rol
            await connection.query(
                "UPDATE roles SET name = ?, description = ? WHERE id = ?",
                [name, description || null, id]
            );

            // Paso B: Limpiar los permisos anteriores (Wipe)
            await connection.query(
                "DELETE FROM role_permissions WHERE role_id = ?",
                [id]
            );

            // Paso C: Insertar los nuevos permisos (Replace)
            if (permissionIds && permissionIds.length > 0) {
                // MySQL requiere un arreglo de arreglos para inserciones múltiples: [[1, 2], [1, 5]]
                const values = permissionIds.map(permId => [id, permId]);
                
                await connection.query(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                    [values]
                );
            }

            await connection.commit(); // 3. Si todo salió bien, guardamos los cambios
            return true;

        } 
        
        catch (error) {
            await connection.rollback(); // Si algo falla, deshacemos todo
            throw error;
        } 
        
        finally {
            connection.release(); // 4. Liberamos la conexión de vuelta al pool
        }
    },

  // 5. Limpiar roles actuales y asignar nuevos (Sincronización)
  syncUserRoles: async (userId, roleIds) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Borramos los roles que ya tenía para evitar duplicados
      await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);

      // Insertamos los nuevos roles seleccionados
      const values = roleIds.map(roleId => [userId, roleId]);
      await connection.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ?",
        [values]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  /**
   * Cuenta cuántos usuarios tienen asignado este rol actualmente.
   */
  countUsersByRoleId: async (roleId) => {
      const query = "SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?";
      const [rows] = await pool.query(query, [roleId]);
      return rows[0].count;
  },
/**
   * Elimina las relaciones del rol y el registro maestro en una transacción de base de datos.
   */
  delete: async (id) => {
      const connection = await pool.getConnection();

      try {
          await connection.beginTransaction();

          // Paso 1: Eliminar la relación con cualquier permiso (Tabla pivote)
          await connection.query(
              "DELETE FROM role_permissions WHERE role_id = ?",
              [id]
          );

          // Paso 2: Eliminar el rol maestro
          await connection.query(
              "DELETE FROM roles WHERE id = ?",
              [id]
          );

          await connection.commit();
          return true;

      } catch (error) {
          await connection.rollback();
          throw error;
      } finally {
          connection.release();
      }
  }  
};