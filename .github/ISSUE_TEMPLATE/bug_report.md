---
name: "Reporte de Bug (Backend/API)"
about: Documenta un fallo en el servidor, base de datos o lógica de la API con evidencia técnica.
title: "fix: [Descripción corta del error en el endpoint]"
labels: bug, backend
assignees: ''
---

> **ADVERTENCIA TÉCNICA:** Un error de backend reportado sin el cURL exacto de reproducción, el payload enviado y el stack trace del servidor será cerrado. No se aceptan descripciones vagas. Borra los textos de ejemplo antes de enviar.

## 1. Contexto de Ejecución (Entorno del Servidor)
* **Entorno:** *Ejemplo: Local / Staging / Producción*
* **Versión de Node.js / PHP:** *Ejemplo: Node v20.10.0 / PHP 8.2*
* **Versión de Base de Datos:** *Ejemplo: MySQL 8.0*
* **Cliente API:** *Ejemplo: Postman v10 / ThunderClient / cURL*

## 2. Flujo de Reproducción (Contrato HTTP)
*Detalla exactamente cómo invocar el error. Incluye los datos exactos que enviaste.*

**Petición Exacta:**
* **Método y Endpoint:** `POST /api/v1/usuarios`
* **Headers requeridos:** `Authorization: Bearer <token_valido>`
* **Payload (Body) enviado:**
```json
{
  "nombre": "Juan",
  "email": "juan@correo",
  "rol_id": 2
}
```
## 3. Contraste de Expectativas

**Comportamiento Actual (El Error):**
* *Ejemplo: El validador (Zod/Request) no detecta el formato de email inválido, el controlador pasa el dato al servicio y la base de datos colapsa arrojando un error 500 por restricción de clave única o formato.*

**Comportamiento Esperado (El Contrato Lógico):**
* *Ejemplo: El middleware de validación debería interceptar el formato de email erróneo y retornar un HTTP `422 Unprocessable Entity` con el detalle del campo fallido, sin tocar el controlador.*

## 4. Evidencia Técnica Estricta
*Adjunta los logs crudos. No recortes información.*

- [ ] **Stack Trace del Servidor (Log de la terminal):** ```text
TypeError: Cannot read properties of undefined (reading 'id') at UserService.createUser (src/services/UserService.js:42)```
- [ ] **Respuesta HTTP recibida (Raw Response):** *Ejemplo: `500 Internal Server Error` - `{"success": false, "message": "Error interno"}`*
- [ ] **Estado de la Base de Datos (Si aplica):** *Ejemplo: El registro se insertó parcialmente creando datos huérfanos.*