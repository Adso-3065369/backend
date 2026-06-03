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

├── .github/            # Flujos de trabajo de GitHub Actions (Gatekeeper automatizado)
├── docs/               # Manuales técnicos, RFCs y Bitácoras de Inspección
├── scripts/            # Scripts de automatización y base de datos (SQL y Seeds)
├── src/
│   ├── config/         # Conexión a DB y variables globales
│   ├── controllers/    # Los Gerentes (Manejo de peticiones HTTP y respuestas)
│   ├── middlewares/    # Los Guardias (Seguridad, Auth y validaciones)
│   ├── models/         # Los Archivistas (Capa de datos y consultas SQL)
│   ├── routes/         # La Recepción (Enrutamiento de la API)
│   ├── schemas/        # Los Planos (Validación de estructuras con Zod)
│   ├── services/       # Los Especialistas (Lógica de negocio pura y aislada)
│   ├── tests/          # El Laboratorio (Pruebas de integración e unitarias)
│   ├── utils/          # Herramientas de apoyo compartidas
│   └── app.js          # El Corazón de Express (Configuración de la app)
├── .babelrc            # Configuración del compilador (Soporte ES6+ para Jest)
├── .env                # Secretos y credenciales (Entorno de desarrollo/producción)
├── .env.example        # Plantilla pública de variables de entorno requeridas
├── .env.test           # Credenciales exclusivas para inyección de pruebas (cross-env)
├── .gitignore          # Reglas de exclusión de repositorios (node_modules, .env)
├── CONTRIBUTING.md     # Estándares de commits y reglas de Pull Requests
├── LICENSE             # Licencia legal del código fuente
├── package.json        # Manifiesto de dependencias y scripts de ejecución (npm)
├── package-lock.json   # Árbol exacto de versiones de dependencias
├── README.md           # Póliza de Integridad y documentación principal
├── server.js           # El Interruptor de encendido (Levanta el puerto)
└── TEAM_AGREEMENT.md   # Acuerdos y normativas disciplinarias para los aprendices

```

## 3. Anatomía de las Capas (Separación de Responsabilidades)

En un entorno industrial, nadie hace el trabajo del otro. Hemos diseñado el proyecto como una empresa bien estructurada, donde cada carpeta es un departamento especializado:

| Capa / Carpeta | Analogía | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **`server.js`** | **El Interruptor** | Archivo de entrada. Solo enciende el servidor y escucha en un puerto específico. No sabe de lógica de negocio. |
| **`src/app.js`** | **La Fábrica** | Configura Express, aplica middlewares globales (CORS, JSON) y monta las rutas principales. |
| **`src/config/`** | **La Sala de Máquinas** | Archivos de configuración externa, como la conexión con la base de datos MySQL (Pool) y carga de variables de entorno. |
| **`src/routes/`** | **La Recepción** | Define las URLs y los métodos HTTP (GET, POST). Su único trabajo es redirigir el tráfico hacia el controlador correcto. |
| **`src/middlewares/`** | **Los Guardias de Seguridad** | Interceptan la petición antes de que pase. Verifican el token JWT (`verifyToken`) y confirman si el usuario tiene el rol y los permisos necesarios. |
| **`src/schemas/`** | **Los Inspectores de Calidad** | Usando **Zod**, revisan que los datos enviados en el Body (JSON) tengan el formato, longitud y tipo correcto. Si algo está mal, rechazan la petición inmediatamente. |
| **`src/controllers/`** | **El Gerente de Operaciones** | Orquesta el proceso. Recibe la petición limpia, delega el trabajo pesado a la capa de servicios y decide qué respuesta HTTP enviar al cliente. |
| **`src/services/`** | **Los Especialistas** | Ejecutan la **lógica de negocio pura**. Aplican reglas, cálculos y validaciones de negocio independientes del protocolo HTTP antes de solicitar o alterar datos. |
| **`src/models/`** | **El Archivista (SQL)** | La **única capa** que tiene permitido hablar con la base de datos. Aquí viven las consultas SQL y las transacciones. No sabe de HTTP, Postman ni reglas de negocio. |
| **`src/tests/`** | **El Laboratorio** | Entorno de control de calidad. Ejecuta las pruebas de integración validando el flujo completo (API + Base de Datos) mediante herramientas como Jest y Supertest. |
| **`src/utils/`** | **La Caja de Herramientas** | Funciones reutilizables que evitan repetir código. Aquí viven utilidades genéricas como el formateador de respuestas o el capturador de excepciones. |
| **`scripts/`** | **Departamento de Mantenimiento** | Archivos ajenos a la ejecución de la API. Contiene la estructuración de la base de datos, migraciones y semillas de datos maestros en SQL. |
| **`docs/`** | **La Oficina de Proyectos** | Almacena los procesos de ingeniería: Manuales técnicos, solicitudes de nuevas funcionalidades (RFCs) y Bitácoras de Inspección de código. |

## 4. El Ciclo de Vida de una Petición (El Pipeline)

Para entender la arquitectura de esta API, analiza el flujo de ejecución mediante un caso real: la creación de un nuevo Rol (`POST /api/roles`). Este es el viaje inmutable que recorre la información:

1. **El Cliente (Frontend/Postman):** Envía el *payload* (JSON) con los datos del nuevo rol hacia el endpoint `/api/roles`.
2. **Recepción (`routes/`):** El enrutador intercepta la solicitud HTTP `POST` y la canaliza hacia el pipeline de validación y control.
3. **El Filtro de Seguridad (`middlewares/`):** 
   * Primero, el middleware de **autenticación** intercepta la petición para validar la firma criptográfica y vigencia del token JWT.
   * Segundo, el middleware de **autorización** cruza la matriz de permisos para confirmar si el usuario posee el permiso estricto `"roles.create"`.
4. **Inspección de Calidad (`schemas/`):** El validador estricto (Zod) audita la estructura del JSON. Exige que el campo `name` sea un *string* válido (>3 caracteres) y que la `description` cumpla el esquema. Si falla, el flujo se corta inmediatamente y retorna un `400 Bad Request`.
5. **Delegación de Responsabilidad (`controllers/`):** El controlador recibe el payload sanitizado y **únicamente** se encarga de invocar al servicio correspondiente. No contiene reglas de negocio ni cálculos.
6. **Ejecución de Lógica (`services/`):** El servicio recibe los datos, procesa la lógica de negocio (validaciones de existencia, reglas adicionales) y solicita al modelo la persistencia. Es el **cerebro** de la operación.
7. **Persistencia (`models/`):** El modelo (la única capa autorizada) traduce la orden del servicio a SQL (`INSERT INTO roles...`), la ejecuta contra el motor MySQL y retorna el registro recién insertado al servicio.
8. **Respuesta Formateada (`utils/`):** El controlador recibe el resultado desde el servicio, invoca el formateador de respuestas para empaquetar la salida bajo el contrato estándar (`success: true`, `data: ...`) y despacha la respuesta HTTP al cliente.

> **CONTROL DE EXCEPCIONES:** Si ocurre una falla estructural en **cualquier punto** del ciclo (caída de BD, colisión de datos, token manipulado), la utilidad de captura global (`catchAsync`) intercepta la excepción y emite una respuesta de error estandarizada. El servidor **nunca** debe detener su ejecución por una excepción no controlada.