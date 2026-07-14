# Guia para la implementacion de la tabla configuración en la base de datos

En esta guia se presentara lo principal para que el apartado de configuracion y los permisos correspondientes puedan funcionar


# MYSQL - Sql de la tabla configuracion y guardar la informacion de la empresa

## Ejecutar el sql de configuracion en el Mysql

Tabla correspondiente para almacenar la informacion de la empresa

```sql
CREATE TABLE configurations (
    id INT PRIMARY KEY,
    nombre_negocio VARCHAR(150) NOT NULL,
    nit VARCHAR(50) NOT NULL,
    iva DECIMAL(5, 2) NOT NULL DEFAULT 19.00,
    actualizado_fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

# MYSQL - Permisos requeridos para seguridad y funcionamiento

## Ejecutar el sql de permisos en el Mysql

Estos permisos se usaran para quienes pueden acceder o editar la informacion de la empresa, para entrar a mas detalle se puede consultar
el markdown de RBAC_GUIDE.md para su mejor visualizacion y comprension

El administrador puede visualizar y editar la informacion de la empresa.

```sql
INSERT INTO permissions (name, code, description) VALUES
('Configuración', 'config.index', 'Permite Ingresar a la vista de configuracion del sistema'),
('Actualizar Configuración', 'config.update', 'Permite cambiar IVA y datos del negocio');
```


# VISTA ROLES

En la vista de **Roles** desde el rol de **Administrador**, acceder a este mismo rol y editar los permisos para validar los permisos de ver y editar configuracion

Se recomienda encarecidamente validar que los permisos de Administrador puedan acceder a Configuracion

# Permisos

 - Configuracion
 - Actualizar Configuracion

Con esos permisos valide que esten verificados en el rol de Administrador y luego darle a **Actualizar rol** para guardar los cambios
