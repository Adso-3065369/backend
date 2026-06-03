import { PermissionService } from "../services/permission.service.js";
import { successResponse } from "../utils/response.handler.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getPermissions = catchAsync(async (req, res) => {
  // Delegamos la responsabilidad al servicio
  const permissionsData = await PermissionService.getAllPermissions();

  return successResponse(res, 200, "Catálogo de permisos obtenido exitosamente", permissionsData);
});