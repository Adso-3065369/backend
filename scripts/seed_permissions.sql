START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- Insertar los permisos omitiendo IDs para que se auto-incrementen
INSERT IGNORE INTO permissions (name, slug, description, created_at, updated_at) VALUES
('Ver Productos', 'products.view', 'Permite consultar la lista y el detalle de productos', NOW(), NOW()),
('Crear Productos', 'products.create', 'Permite registrar nuevos productos en el sistema', NOW(), NOW()),
('Actualizar Productos', 'products.update', 'Permite modificar productos existentes', NOW(), NOW()),
('Eliminar Productos', 'products.delete', 'Permite dar de baja productos del sistema', NOW(), NOW()),
('Ver Categorías', 'categories.view', 'Permite listar y consultar el detalle de las categorías', NOW(), NOW()),
('Crear Categorías', 'categories.create', 'Permite registrar nuevas categorías', NOW(), NOW()),
('Actualizar Categorías', 'categories.update', 'Permite modificar la información de categorías existentes', NOW(), NOW()),
('Eliminar Categorías', 'categories.delete', 'Permite eliminar categorías del sistema', NOW(), NOW()),
('Crear Roles', 'roles.create', 'Permite registrar nuevos roles en el sistema', NOW(), NOW()),
('Ver Roles', 'roles.view', 'Permite listar y ver el detalle de los roles existentes', NOW(), NOW()),
('Editar Roles', 'roles.update', 'Permite modificar el nombre o descripción de un rol', NOW(), NOW()),
('Eliminar Roles', 'roles.delete', 'Permite eliminar roles del sistema', NOW(), NOW()),
('Asignar Permisos a Roles', 'permissions.assign', 'Permite decidir qué permisos tiene cada rol', NOW(), NOW()),
('Asignar Roles', 'roles.assign', 'Permite asignar roles a los usuarios del sistema', NOW(), NOW()),
('Listar Roles', 'roles.index', 'Permite listar los roles del sistema', NOW(), NOW()),
('Listar Permisos', 'permissions.index', 'Permite listar los permisos del sistema', NOW(), NOW()),
('Listar Categorias', 'categories.index', 'Permite listar las categorias del sistema', NOW(), NOW()),
('Listar Productos', 'products.index', 'Permite listar los productos del sistema', NOW(), NOW()),
('Ver dashboard', 'dashboard.index', 'Permite ver el dashboard del sistema', NOW(), NOW()),
('Listra usuarios', 'users.index', 'Permite los usuarios del sistema', NOW(), NOW()),
('Ver usuario', 'users.show', 'Permite ver los detalles un un usuario', NOW(), NOW()),
('listar clientes', 'clients.index', 'Permite ver los clientes del sistema', NOW(), NOW()),
('Ver cliente', 'clients.view', 'Permite ver los datos de un cliente', NOW(), NOW()),
('Crear clientes', 'clients.create', 'Permite crear clientes', NOW(), NOW()),
('Actualizar clientes', 'clients.update', 'Permite actualizar clientes', NOW(), NOW()),
('Eliminar clientes', 'clients.delete', 'Permite eliminar clientes', NOW(), NOW()),
('Listar Ventas', 'sales.index', 'Permite acceder a la tabla o listado general de ventas', NOW(), NOW()),
('Ver Detalle de Venta', 'sales.view', 'Permite consultar la información específica de una venta', NOW(), NOW()),
('Crear Ventas', 'sales.create', 'Permite registrar y facturar nuevas ventas', NOW(), NOW()),
('Actualizar Ventas', 'sales.update', 'Permite modificar detalles de ventas existentes', NOW(), NOW()),
('Eliminar Ventas', 'sales.delete', 'Permite anular ventas del sistema', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;