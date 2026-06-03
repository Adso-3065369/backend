# Configuración de la Base de Datos

Esta guía detalla los comandos necesarios para inicializar el entorno de base de datos para el proyecto **Inventario ADSO**. Siga estos pasos para asegurar una configuración segura y funcional.

---

## Requisitos Previos

* **Motor de Base de Datos:** MySQL Server 8.0+ o MariaDB.
* **Cliente SQL:** Terminal de comandos, MySQL Workbench.
* **Usuario:** Acceso con privilegios de `root` para la configuración inicial.

---

## Pasos de Configuración

Ejecute el siguiente bloque de comandos en su gestor de base de datos preferido:

### 1. Creación del Esquema
Se crea el contenedor lógico para las tablas del sistema si aún no existe.
```sql
CREATE DATABASE IF NOT EXISTS inventario_adso;
```

### 2. Gestión de Seguridad (Usuario Dedicado)
Por estándares de seguridad industrial, la aplicación no debe conectarse usando el usuario root. Creamos un usuario específico restringido a conexiones desde el servidor local.
```sql
CREATE USER 'app_user'@'localhost' IDENTIFIED BY '#ADSO_node';
```

### 3. Asignación de Privilegios
Otorgamos control total al usuario app_user únicamente sobre la base de datos del proyecto, siguiendo el Principio de Menor Privilegio.
```sql
GRANT ALL PRIVILEGES ON inventario_adso.* TO 'app_user'@'localhost';
```

### 4. Aplicación de Cambios
Forzamos al motor de base de datos a recargar las tablas de permisos para que los cambios surtan efecto inmediatamente.
```sql
FLUSH PRIVILEGES;
```

### Configuración del Entorno (.env)
```code
DB_HOST=localhost
DB_USER=app_user
DB_PASSWORD=#ADSO_node
DB_NAME=inventario_adso
DB_PORT=3306
JWT_SECRET=MiSuperSecretoSeguro
JWT_REFRESH_SECRET=OtroSecretoAunMasLargo
JWT_ACCESS_EXPIRATION=2m
JWT_REFRESH_EXPIRATION=7d
```

### NOTA
Nunca suba el archivo `.env` al repositorio de `Git`. Este archivo contiene credenciales sensibles y debe estar incluido en el archivo `.gitignore`.
