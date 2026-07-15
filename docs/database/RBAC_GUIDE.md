# Sistema de Control de Acceso (RBAC) - Matriz Completa

Esta matriz define los permisos granulares asignados por cada rol. El middleware `checkPermission('slug')` es el encargado de validar estas reglas en cada endpoint de la API.

## 1. Gestión de Operaciones
| Módulo | Acción | Código (`slug`) | Admin | Editor | Auditor |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Productos** | Listar | `products.index` | ✅ | ✅ | ✅ |
| | Ver | `products.view` | ✅ | ✅ | ✅ |
| | Crear | `products.create` | ✅ | ✅ | ❌ |
| | Actualizar | `products.update` | ✅ | ✅ | ❌ |
| | Eliminar | `products.delete` | ✅ | ❌ | ❌ |
| **Categorías** | Listar | `categories.index` | ✅ | ✅ | ✅ |
| | Ver | `categories.view` | ✅ | ✅ | ✅ |
| | Crear | `categories.create` | ✅ | ✅ | ❌ |
| | Actualizar | `categories.update` | ✅ | ❌ | ❌ |
| | Eliminar | `categories.delete` | ✅ | ❌ | ❌ |
| **Clientes** | Listar | `clients.index` | ✅ | ✅ | ✅ |
| | Ver | `clients.view` | ✅ | ✅ | ✅ |
| | Crear | `clients.create` | ✅ | ✅ | ❌ |
| | Actualizar | `clients.update` | ✅ | ✅ | ❌ |
| | Eliminar | `clients.delete` | ✅ | ❌ | ❌ |
| **Ventas** | Listar | `sales.index` | ✅ | ✅ | ✅ |
| | Ver | `sales.view` | ✅ | ✅ | ✅ |
| | Crear | `sales.create` | ✅ | ✅ | ❌ |
| | Actualizar | `sales.update` | ✅ | ❌ | ❌ |
| | Eliminar | `sales.delete` | ✅ | ❌ | ❌ |

## 2. Gestión del Sistema y Usuarios
| Módulo | Acción | Código (`slug`) | Admin | Editor | Auditor |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Dashboard** | Ver | `dashboard.index` | ✅ | ✅ | ✅ |
| **Usuarios** | Listar | `users.index` | ✅ | ❌ | ✅ |
| | Ver | `users.show` | ✅ | ❌ | ✅ |
| **Roles** | Listar | `roles.index` | ✅ | ❌ | ❌ |
| | Ver | `roles.view` | ✅ | ❌ | ❌ |
| | Crear | `roles.create` | ✅ | ❌ | ❌ |
| | Editar | `roles.update` | ✅ | ❌ | ❌ |
| | Eliminar | `roles.delete` | ✅ | ❌ | ❌ |
| | Asignar | `roles.assign` | ✅ | ❌ | ❌ |
| **Permisos** | Listar | `permissions.index` | ✅ | ❌ | ❌ |
| | Asignar | `permissions.assign` | ✅ | ❌ | ❌ |
| **Configuracion** | Ver | `config.index` | ✅ | ❌ | ❌ |
| | Editar | `config.update` | ✅ | ❌ | ❌ |


> **Nota de Seguridad:** Cualquier intento de acceso sin el permiso correspondiente resultará en una respuesta `403 Forbidden`. El rol **Admin** tiene acceso irrestricto, mientras que el rol **Auditor** está estrictamente limitado a lecturas.


## 3. Inicialización de Permisos
Para desplegar la estructura de permisos, ejecuta el script `scripts/seed_permissions.sql`.

```sql
-- Ejecutar tras la creación de tablas
INSERT IGNORE INTO permissions (name, slug, description, created_at, updated_at) VALUES
('Ver Productos', 'products.view', 'Consulta de detalle', NOW(), NOW()),
('Crear Productos', 'products.create', 'Registro de productos', NOW(), NOW()),
('Actualizar Productos', 'products.update', 'Edición de productos', NOW(), NOW()),
('Eliminar Productos', 'products.delete', 'Baja de productos', NOW(), NOW()),
('Listar Productos', 'products.index', 'Listado general', NOW(), NOW()),
('Ver Categorías', 'categories.view', 'Consulta de detalle', NOW(), NOW()),
('Crear Categorías', 'categories.create', 'Registro de categorías', NOW(), NOW()),
('Actualizar Categorías', 'categories.update', 'Edición de categorías', NOW(), NOW()),
('Eliminar Categorías', 'categories.delete', 'Eliminación de categorías', NOW(), NOW()),
('Listar Categorias', 'categories.index', 'Listado general', NOW(), NOW()),
('Crear Roles', 'roles.create', 'Registro de roles', NOW(), NOW()),
('Ver Roles', 'roles.view', 'Detalle de rol', NOW(), NOW()),
('Editar Roles', 'roles.update', 'Edición de roles', NOW(), NOW()),
('Eliminar Roles', 'roles.delete', 'Eliminación de roles', NOW(), NOW()),
('Asignar Permisos', 'permissions.assign', 'Asignar permisos a roles', NOW(), NOW()),
('Asignar Roles', 'roles.assign', 'Asignar roles a usuarios', NOW(), NOW()),
('Listar Roles', 'roles.index', 'Listado de roles', NOW(), NOW()),
('Listar Permisos', 'permissions.index', 'Listado de permisos', NOW(), NOW()),
('Ver dashboard', 'dashboard.index', 'Acceso al panel', NOW(), NOW()),
('Listra usuarios', 'users.index', 'Listado usuarios', NOW(), NOW()),
('Ver usuario', 'users.show', 'Detalle usuario', NOW(), NOW()),
('Listar clientes', 'clients.index', 'Listado clientes', NOW(), NOW()),
('Ver cliente', 'clients.view', 'Detalle de cliente', NOW(), NOW()),
('Crear clientes', 'clients.create', 'Registro de clientes', NOW(), NOW()),
('Actualizar clientes', 'clients.update', 'Edición de clientes', NOW(), NOW()),
('Eliminar clientes', 'clients.delete', 'Eliminación de clientes', NOW(), NOW()),
('Listar Ventas', 'sales.index', 'Listado general ventas', NOW(), NOW()),
('Ver Detalle de Venta', 'sales.view', 'Detalle de venta', NOW(), NOW()),
('Crear Ventas', 'sales.create', 'Registro de ventas', NOW(), NOW()),
('Actualizar Ventas', 'sales.update', 'Edición de ventas', NOW(), NOW()),
('Eliminar Ventas', 'sales.delete', 'Anulación de ventas', NOW(), NOW());
('Configuración', 'config.index', 'Permite Ingresar a la vista de configuracion del sistema', NOW(), NOW()),
('Actualizar Configuración', 'config.update', 'Permite cambiar IVA y datos del negocio', NOW(),NOW());
```