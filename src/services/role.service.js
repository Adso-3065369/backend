import { RoleModel } from "../models/role.model.js";
import { PermissionModel } from "../models/permission.model.js";

export const RoleService = {
  getRolesWithPermissions: async () => {
    // 1. Ejecutamos ambas consultas en paralelo para ganar velocidad
    const [roles, allPermissions] = await Promise.all([
      RoleModel.findAll(),
      PermissionModel.findAllAssigned()
    ]);

    // 2. Ensamblamos la data usando JavaScript puro
    const assembledRoles = roles.map(role => {
      // Filtramos los permisos que le pertenecen a este rol específico
      const rolePermissions = allPermissions
        .filter(p => p.role_id === role.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description
        })); // Limpiamos el role_id que ya no necesitamos en la respuesta final

      // Retornamos el objeto clonado con su nuevo arreglo de permisos
      return {
        ...role,
        permissions: rolePermissions
      };
    });

    return assembledRoles;
  },

  getRoleByIdWithPermissions: async (id) => {
    // 1. Consulta principal al recurso padre
    const role = await RoleModel.findById(id);

    // 2. Verdadera validación temprana (Fail-Fast). 
    // Corta la ejecución antes de hacer otra consulta inútil.
    if (!role) {
      return null;
    }

    // 3. Consulta dependiente (solo consume recursos si el rol existe)
    const permissions = await PermissionModel.findByRoleId(id);

    // 4. Ensamblaje
    return {
      ...role,
      permissions
    };
  },

  createRole: async (roleData) => {
      // 2. Ejecutar la creación transaccional
      const newRoleId = await RoleModel.create(roleData);

      // 3. Retornar el objeto completo ensamblado
      return await RoleService.getRoleByIdWithPermissions(newRoleId);
  },  

  updateRole: async (id, roleData) => {
      // 1. Verificamos que el rol exista
      const existingRole = await RoleModel.findById(id);
      if (!existingRole) {
          return null;
      }

      // 2. Ejecutamos la actualización transaccional
      await RoleModel.update(id, roleData);

      // 3. Opcional: Retornamos el rol actualizado (puedes reusar tu método con permisos)
      return await RoleService.getRoleByIdWithPermissions(id);
  },
  deleteRole: async (id) => {
    // 1. Validar si el rol existe en el sistema
    const existingRole = await RoleModel.findById(id);
    if (!existingRole) {
        return { success: false, status: 404, message: "El rol especificado no existe." };
    }

    // 2. REGLA CRÍTICA: Validar que el rol no esté asignado a ningún usuario
    const userCount = await RoleModel.countUsersByRoleId(id);
    if (userCount > 0) {
        return { 
            success: false, 
            status: 400, 
            message: `Operación denegada: Este rol está asignado a ${userCount} usuario(s) y no puede ser eliminado.` 
        };
    }

    // 3. Si pasa la validación, procedemos a la eliminación transaccional
    await RoleModel.delete(id);
    
    return { success: true, status: 200, message: "Rol y sus permisos asociados eliminados exitosamente." };
  }  
};