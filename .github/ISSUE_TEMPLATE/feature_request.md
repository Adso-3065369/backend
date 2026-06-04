---
name: "Nueva Funcionalidad API (Feature)"
about: Propón un nuevo endpoint, esquema de base de datos o refactorización arquitectónica.
title: "feat: [Nombre del nuevo módulo o endpoint]"
labels: enhancement, api
assignees: ''
---

> **ADVERTENCIA TÉCNICA:** No se desarrolla ningún endpoint sin definir primero su contrato de entrada y salida. Toda funcionalidad debe respetar el pipeline: Route -> Middleware -> Schema -> Controller -> Service -> Model. Borra los textos de ejemplo antes de enviar.

## 1. Justificación y Valor de Negocio
*¿Por qué la API necesita esta funcionalidad? ¿Qué proceso de negocio soporta?*
**Justificación:** * *Ejemplo: El frontend requiere una forma de descargar reportes masivos en Excel. Actualmente las consultas a la base de datos son síncronas y bloquean el event loop. Necesitamos un endpoint asíncrono para esta tarea.*

## 2. Contrato de la API (API Design)
*Define la firma del nuevo endpoint o la modificación requerida.*

* **Método y Ruta:** `GET /api/v1/reportes/ventas/exportar`
* **Query Params / Body requeridos:** `?fecha_inicio=2023-01-01&fecha_fin=2023-12-31`
* **Respuesta de Éxito Esperada (200 OK / 201 Created):**
```json
{
  "success": true,
  "data": {
    "job_id": "9a4f2c-...",
    "status": "processing"
  }
}
```
## 3. Propuesta de Arquitectura y Capas
*Define cómo se integrará en el backend sin romper responsabilidades.*

* **Middlewares / Schemas:** *Ejemplo: Nuevo esquema Zod para validar el rango de fechas en los query params.*
* **Services:** *Ejemplo: Crear `ReportService` que ejecute la lógica de extracción, desacoplado del controlador.*
* **Base de Datos / Migraciones:** *Ejemplo: Ninguna, solo son consultas de lectura (`SELECT`).*

## 4. Definition of Done (Criterios de Aceptación)
*El Pull Request será rechazado si no cumple con estos puntos.*

- [ ] *Ejemplo: El endpoint está protegido por el middleware de autenticación y requiere permisos de `ADMIN`.*
- [ ] *Ejemplo: Si las fechas enviadas son inválidas, retorna código `422`.*
- [ ] *Ejemplo: Se actualizó la colección de Postman o el archivo Swagger/OpenAPI con el nuevo endpoint.*
- [ ] *Ejemplo: La lógica de negocio está aislada en la capa de servicios, el controlador solo maneja la petición/respuesta.*