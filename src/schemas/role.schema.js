import { z } from "zod";

// Para crear un nuevo rol
export const roleSchema = z.object({
  name: z.string({
    required_error: "El nombre del rol es obligatorio",
    invalid_type_error: "El nombre del rol debe ser un texto"
  }).min(3, "El nombre del rol debe tener al menos 3 caracteres"),
  
  description: z.string({
    required_error: "La descripción es obligatoria",
    invalid_type_error: "La descripción debe ser un texto"
  }).max(255, "La descripción es demasiado larga"),

  // 🚀 NUEVO: Mapeo exacto para recibir la lista de permisos
  permissionIds: z.array(
    z.number({
      invalid_type_error: "Los IDs de los permisos deben ser números enteros"
    }),
    {
      required_error: "La lista de permisos es obligatoria",
      invalid_type_error: "Los permisos deben enviarse en formato de lista (Array)"
    }
  ).min(1, "Debe asignar al menos un permiso al perfil")

}).strict();

// Para actualizar un rol existente (puede incluir permisos)
export const updateRoleSchema = z.object({
  name: z.string({
    required_error: "El nombre del rol es obligatorio",
    invalid_type_error: "El nombre del rol debe ser un texto"
  }).min(3, "El nombre del rol debe tener al menos 3 caracteres"),
  
  description: z.string({
    required_error: "La descripción es obligatoria",
    invalid_type_error: "La descripción debe ser un texto"
  }).max(255, "La descripción es demasiado larga"),

  // Validamos que lleguen los permisos y sean un arreglo numérico
  permissionIds: z.array(
    z.number({
      invalid_type_error: "Los IDs de los permisos deben ser números enteros"
    }),
    {
      required_error: "La lista de permisos es obligatoria",
      invalid_type_error: "Los permisos deben enviarse en formato de lista (Array)"
    }
  ).min(1, "Debe asignar al menos un permiso al perfil") // Sincronizado con la regla del Frontend
  
}).strict();

// Para asignar roles a un usuario
export const assignRoleSchema = z.object({
  userId: z.number({
    required_error: "El ID del usuario es obligatorio"
  }).int().positive(),
  
  roles: z.array(z.number(), {
    required_error: "Debes enviar un arreglo de IDs de roles"
  }).nonempty("El usuario debe tener al menos un rol")
}).strict();