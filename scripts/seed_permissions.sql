START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- Se reemplaza 'slug' por 'code' según la estructura de la tabla.
-- Se omiten los timestamps manuales; MySQL los gestiona automáticamente.
INSERT IGNORE INTO permissions (name, code, description) VALUES
('Ver Productos', 'products.view', 'Permite consultar la lista y el detalle de productos'),
('Crear Productos', 'products.create', 'Permite registrar nuevos productos en el sistema'),
('Actualizar Productos', 'products.update', 'Permite modificar productos existentes'),
('Eliminar Productos', 'products.delete', 'Permite dar de baja productos del sistema'),
('Ver Categorías', 'categories.view', 'Permite listar y consultar el detalle de las categorías'),
('Crear Categorías', 'categories.create', 'Permite registrar nuevas categorías'),
('Actualizar Categorías', 'categories.update', 'Permite modificar la información de categorías existentes'),
('Eliminar Categorías', 'categories.delete', 'Permite eliminar categorías del sistema'),
('Crear Roles', 'roles.create', 'Permite registrar nuevos roles en el sistema'),
('Ver Roles', 'roles.view', 'Permite listar y ver el detalle de los roles existentes'),
('Editar Roles', 'roles.update', 'Permite modificar el nombre o descripción de un rol'),
('Eliminar Roles', 'roles.delete', 'Permite eliminar roles del sistema'),
('Asignar Permisos a Roles', 'permissions.assign', 'Permite decidir qué permisos tiene cada rol'),
('Asignar Roles', 'roles.assign', 'Permite asignar roles a los usuarios del sistema'),
('Listar Roles', 'roles.index', 'Permite listar los roles del sistema'),
('Listar Permisos', 'permissions.index', 'Permite listar los permisos del sistema'),
('Listar Categorias', 'categories.index', 'Permite listar las categorias del sistema'),
('Listar Productos', 'products.index', 'Permite listar los productos del sistema'),
('Ver dashboard', 'dashboard.index', 'Permite ver el dashboard del sistema'),
('Listra usuarios', 'users.index', 'Permite los usuarios del sistema'),
('Ver usuario', 'users.show', 'Permite ver los detalles un un usuario'),
('listar clientes', 'clients.index', 'Permite ver los clientes del sistema'),
('Ver cliente', 'clients.view', 'Permite ver los datos de un cliente'),
('Crear clientes', 'clients.create', 'Permite crear clientes'),
('Actualizar clientes', 'clients.update', 'Permite actualizar clientes'),
('Eliminar clientes', 'clients.delete', 'Permite eliminar clientes'),
('Listar Ventas', 'sales.index', 'Permite acceder a la tabla o listado general de ventas'),
('Ver Detalle de Venta', 'sales.view', 'Permite consultar la información específica de una venta'),
('Crear Ventas', 'sales.create', 'Permite registrar y facturar nuevas ventas'),
('Actualizar Ventas', 'sales.update', 'Permite modificar detalles de ventas existentes'),
('Eliminar Ventas', 'sales.delete', 'Permite anular ventas del sistema'),
('Configuración', 'config.index', 'Permite Ingresar a la vista de configuracion del sistema');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;