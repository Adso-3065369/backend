# Sistema de Inventario ADSO - Arquitectura Profesional

¡Felicidades, aprendiz! Has dejado atrás los prototipos simples para entrar en el desarrollo de *Software de Clase Mundial*. Este proyecto es una API robusta construida con *Node.js, ES Modules* y una arquitectura de persistencia real en *MySQL*.

Ya no guardamos datos en la memoria volátil; ahora construimos sistemas con *integridad referencial, seguridad por roles (RBAC) y validaciones estrictas*.

---
## 1. Instalación y Puesta en Marcha
Para levantar este ecosistema en tu máquina local, sigue estos pasos:
```bash
# 1. Clonar y entrar al proyecto
git clone <url-del-repo>
cd inventario-adso

# 2. Instalar dependencias industriales
npm install

# 3. Configurar el entorno
cp .env.example .env
# Nota: Edita el .env con tus credenciales de MySQL
```

### Scripts de Desarrollo
* `npm run dev`: Inicia el servidor con Nodemon (Recarga automática).
* `npm start`: Inicia el servidor en modo producción.

---
## 2. Anatomía del Proyecto (Estructura)
Hemos organizado el código siguiendo el patrón de *Separación de Responsabilidades* para que sea escalable y fácil de mantener:
```plaintext
├── docs/               # Manuales técnicos y Guías de DB
├── sql/                # Scripts de creación y Seeds
├── src/
│   ├── config/         # Conexión a DB y variables globales
│   ├── controllers/    # Los Gerentes (Lógica de negocio)
│   ├── middlewares/    # Los Guardias (Seguridad y Auth)
│   ├── models/         # Los Archivistas (Consultas SQL)
│   ├── routes/         # La Recepción (Rutas de la API)
│   ├── schemas/        # Los Planos (Validación con Zod)
│   ├── utils/          # Herramientas de apoyo
│   └── app.js          # El Corazón de Express
├── server.js           # El Interruptor de encendido
└── .env                # Secretos y credenciales
```

## 3. Anatomía de las Capas (Separación de Responsabilidades)

En un entorno industrial, nadie hace el trabajo del otro. Hemos diseñado el proyecto como una empresa bien estructurada, donde cada carpeta es un departamento especializado:

| Capa / Carpeta | Analogía | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **`server.js`** | **El Interruptor** | Archivo de entrada. Solo enciende el servidor y escucha en un puerto específico. No sabe de lógica de negocio. |
| **`src/app.js`** | **La Fábrica** | Configura Express, aplica middlewares globales (CORS, JSON) y monta las rutas principales. |
| **`src/config/`** | **La Sala de Máquinas** | Archivos de configuración externa, como la conexión con la base de datos MySQL (Pool) y carga de variables de entorno. |
| **`src/routes/`** | **La Recepción** | Define las URLs y los métodos HTTP (GET, POST). Su único trabajo es redirigir el tráfico hacia el controlador correcto. |
| **`src/middlewares/`** | **Los Guardias de Seguridad** | Interceptan la petición antes de que pase. Verifican el token JWT (`verifyToken`) y confirman si el usuario tiene el rol necesario (`checkPermission`). |
| **`src/schemas/`** | **Los Inspectores de Calidad** | Usando **Zod**, revisan que los datos enviados en el Body (JSON) tengan el formato, longitud y tipo correcto. Si algo está mal, rechazan la petición inmediatamente. |
| **`src/controllers/`** | **El Gerente de Operaciones** | Orquesta el proceso. Recibe la petición limpia, llama al modelo para obtener/guardar datos, y decide qué respuesta enviar al cliente. |
| **`src/models/`** | **El Archivista (SQL)** | La **única capa** que tiene permitido hablar con la base de datos. Aquí viven las consultas SQL y las transacciones. No sabe de HTTP ni de Postman. |
| **`src/utils/`** | **La Caja de Herramientas** | Funciones reutilizables que evitan repetir código. Aquí viven el formateador de respuestas (`response.handler`) y el capturador de errores (`catchAsync`). |

---

## 4. El Ciclo de Vida de una Petición (El Pipeline)



Para entender cómo funciona nuestra API, imagina que intentamos crear un nuevo Rol (`POST /api/roles`). Este es el viaje exacto que hace la información:

1. **El Cliente (Frontend/Postman):** Envía un JSON con los datos del nuevo rol hacia la ruta `/api/roles`.
2. **Recepción (`routes`):** Detecta la solicitud `POST` y la deja entrar al "pasillo" de nuestra API.
3. **El Filtro de Seguridad (`middlewares`):** * Primero, el middleware de autenticación verifica que el usuario haya enviado un JWT válido.
   * Segundo, el middleware de autorización verifica que el usuario tenga el permiso `"roles.create"`.
4. **Inspección de Calidad (`schemas`):** El validador (Zod) revisa el JSON. Verifica que `name` sea un string de más de 3 caracteres y que `description` no esté vacía. Si falla, devuelve un error 400. Si pasa, el dato es seguro.
5. **Toma de Decisiones (`controllers`):** El controlador de roles toma el JSON validado y le da la orden al modelo: *"Guarda esto en la base de datos"*.
6. **Persistencia (`models`):** El modelo ejecuta el `INSERT INTO roles...` en MySQL y recupera el registro recién creado.
7. **Respuesta Formateada (`utils`):** El controlador recibe el dato del modelo, usa la utilidad `successResponse` para empaquetarlo en un JSON estándar profesional (`success: true`, `data: ...`) y se lo envía de vuelta al cliente.

Si ocurre un error en **cualquier punto** del viaje (base de datos caída, error de validación, token expirado), nuestro capturador de errores global (`catchAsync`) lo intercepta y devuelve un mensaje controlado para que el servidor nunca se apague.