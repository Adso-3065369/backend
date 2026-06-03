import { UserService } from "../services/user.service.js";

export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
        
    try {
      if (!req.user) {
        const error = new Error("No autenticado");
        error.statusCode = 401;
        return next(error);
      }

      // 1. Delegación estricta a la capa de negocio para obtener la estructura agrupada
      const userRoles = await UserService.getUserRolesAndPermissions(req.user.id);
      
      // 2. Evaluación de los permisos
      const hasPermission = userRoles.some(role => 
        role.permissions.includes(requiredPermission)
      );

      if (!hasPermission) {
        const error = new Error("No tienes los permisos necesarios para esta acción");
        error.statusCode = 403;
        return next(error);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};