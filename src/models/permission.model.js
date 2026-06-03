import pool from "../config/db.js";

export const PermissionModel = {
  findAll: async () => {
    // Consulta plana para traer el catálogo completo
    const [rows] = await pool.query("SELECT id, name, code, description FROM permissions");
    return rows;
  },
  
  findAllAssigned: async () => {
    // Trae todos los permisos que están asignados a algún rol
    const query = `
      SELECT rp.role_id, p.id, p.name, p.code, p.description 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  findByRoleId: async (roleId) => {
    // Trae exclusivamente los permisos vinculados al ID de ese rol
    const query = `
      SELECT p.id, p.name, p.code, p.description 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `;
    const [rows] = await pool.query(query, [roleId]);
    return rows;
  }
};