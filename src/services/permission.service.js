import { PermissionModel } from "../models/permission.model.js";

export const PermissionService = {
  /**
   * Obtiene el catálogo completo de permisos del sistema.
   * (Preparado para futura lógica de filtrado o agrupación)
   */
  getAllPermissions: async () => {
    const permissions = await PermissionModel.findAll();    
    return permissions;
  }
};