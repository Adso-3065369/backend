#  Estructura de Tablas (DDL)

Este documento describe la estructura detallada de la base de datos `inventario_adso`, incluyendo sus tablas, tipos de datos, llaves primarias y foráneas.

---

## Modelo Entidad-Relación (Resumen)

El sistema utiliza un motor de almacenamiento **InnoDB** para soportar transacciones y llaves foráneas. La estructura se divide en tres módulos principales:
1.  **Seguridad y Acceso (RBAC)**
2.  **Gestión de Inventario**
3.  **Usuarios**

---

## Módulo de Seguridad (RBAC)

### 1. Tabla: `roles`
Almacena los perfiles o cargos del sistema.
```sql
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Tabla: `permissions`
Almacena las acciones atómicas que se pueden realizar.
```sql
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. Tabla: `role_permissions` (Pivote)
Relación Muchos a Muchos entre Roles y Permisos.
```sql
CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

---

## Módulo de Inventario

### 4. Tabla: `categories`
```sql
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 5. Tabla: `products`
```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    category_id INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);
```

---

## Módulo de Usuarios

### 6. Tabla: `users`
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 7. Tabla: `user_roles` (Pivote)
Relación Muchos a Muchos entre Usuarios y Roles.
```sql
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```
###  8. Tabla: clients (Independiente)
```sql
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
### -- 9. Tabla: sales (Cabecera)
```sql
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
```
### -- 10. Tabla: sale_details (El Snapshot Inmutable)
```sql
CREATE TABLE sale_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NULL, 
    product_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
```

## Nota Técnica

* **Integridad Referencial:** Se utiliza `ON DELETE CASCADE` en las tablas pivote para que, al eliminar un usuario o un rol, sus relaciones se limpien automáticamente de las tablas intermedias, evitando así que queden registros "huérfanos".
* **Restricción de Categorías:** En la tabla `products`, se aplica la regla `ON DELETE RESTRICT`. Esto funciona como un seguro de vida para los datos: evita que una categoría sea eliminada si todavía existen productos asociados a ella, obligando a reubicar los productos antes de borrar la categoría.
* **Auditoría:** Todas las tablas del sistema incluyen los campos `created_at` (fecha de creación) y `updated_at` (fecha de última modificación). Esto permite mantener un historial preciso y es una práctica estándar en el desarrollo de software profesional para el seguimiento de la información.
