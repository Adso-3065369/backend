START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles
TRUNCATE TABLE role_permissions;
DELETE FROM roles;
INSERT INTO roles (id, name, description) VALUES 
(1, 'Admin', 'Administrador global del sistema'),
(2, 'Inventario', 'Gestión de productos, categorías y stock'),
(3, 'Vendedor', 'Gestión de clientes y facturación de ventas');

-- 2. Permisos (Suponiendo que ya existen en la tabla permissions)
-- Asignación de permisos:

-- A. Admin (ID 1) -> Acceso total
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions;

-- B. Inventario (ID 2) -> Foco en catálogo
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE slug IN (
    'products.view', 'products.index', 'products.create', 'products.update', 'products.delete',
    'categories.view', 'categories.index', 'categories.create', 'categories.update', 'categories.delete',
    'dashboard.index'
);

-- C. Vendedor (ID 3) -> Foco en clientes y ventas
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE slug IN (
    'products.view', 'products.index',
    'clients.index', 'clients.view', 'clients.create', 'clients.update',
    'sales.index', 'sales.view', 'sales.create', 'sales.update',
    'dashboard.index'
);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;