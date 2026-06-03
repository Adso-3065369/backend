# Guía de Contribución

¡Gracias por formar parte de este proyecto! Para mantener la estabilidad del código en producción y permitir un desarrollo ágil, colaborativo y organizado, seguimos el modelo **Fork & Pull Request** combinado con **GitFlow**.

---

## 1. Configuración del Entorno (Fork & Pull)

Manejamos dos conexiones remotas para garantizar la seguridad del código:
* **`upstream`**: El repositorio original (fuente oficial).
* **`origin`**: Tu copia personal en GitHub (tu Fork).

### ¿Cómo iniciar?
1. **Realizar el Fork:** Haz clic en el botón **"Fork"** en el repositorio original.
2. **Clonar tu Fork:** `git clone https://github.com/TU_USUARIO/nombre-del-proyecto.git`
3. **Vincular el Original:** `git remote add upstream https://github.com/AUTOR_ORIGINAL/nombre-del-proyecto.git`
4. **Validar Remotos:** Ejecuta `git remote -v` y asegúrate de ver ambos.

---

## 2. Sincronización y Gestión de Conflictos 

Antes de cualquier cambio, sincroniza tu base:
```bash
git fetch upstream
git checkout develop
git merge upstream/develop
```
>  **Si hay conflictos:** Detente, resuelve las marcas (`<<<<`, `====`, `>>>>`) en VS Code, guarda, ejecuta `git add .` y `git commit`. **Nunca** desarrolles sobre una base con conflictos.

---

## 3. Estrategia de Ramas (GitFlow)

| Tipo de Rama | Origen | Destino | Propósito |
| :--- | :--- | :--- | :--- |
| **`feature/`** | `develop` | `develop` | Nuevas funciones. |
| **`docs/`** | `develop` | `develop` | Documentación. |
| **`refactor/`** | `develop` | `develop` | Mejora de código sin cambio lógico. |
| **`bugfix/`** | `develop` | `develop` | Errores en desarrollo. |
| **`hotfix/`** | `main` | `main` y `develop` | Errores críticos en producción. |

---

## 4. Estándares de Mensajes (Conventional Commits)

Usa el formato: `tipo: descripción` (ej. `feat: agregar login con google`).

---

## 5. El Ciclo de Vida del Pull Request (PR) 

El PR es la propuesta de tus cambios. No se trata solo de enviar código, sino de explicar **por qué** es valioso.

### A. Arquitectura de un PR Profesional
Al crear un PR en GitHub, debes seguir esta estructura:

* **Título:** Debe ser breve y descriptivo, siguiendo los estándares de commit.
    * *Bien:* `feat: implementar validación de formularios`
    * *Mal:* `cambios nuevos`, `arreglo de bug`.
* **Descripción (Cuerpo):**
    * **¿Qué hace este cambio?** (Resumen de la solución).
    * **¿Por qué es necesario?** (Contexto del problema).
    * **Pruebas realizadas:** (Qué probaste para asegurar que funciona).

### B. Estados del PR
1.  **Abierto (Open):** El PR ha sido enviado y está a la espera de ser revisado por el autor del repositorio.
2.  **En Revisión / Cambios Solicitados:** El autor ha revisado tu código y puede pedirte ajustes o rechazarlo. **No te lo tomes personal;** es parte del control de calidad.
    * Si es rechazado o te piden cambios, lee los comentarios detalladamente.
    * Realiza las correcciones en **tu misma rama local**, haz commit y push. El PR se actualizará automáticamente.
3.  **Cerrado (Merged):** ¡Éxito! Tus cambios han sido aceptados e integrados al proyecto oficial.
4.  **Cerrado (Closed/Declined):** El PR se cierra sin mezclarse porque la solución no es apta o se tomó otro camino.

---

## 6. Proceso Paso a Paso
1.  **Sincroniza** y resuelve conflictos (Sección 2).
2.  **Crea tu rama:** `git checkout -b tipo/nombre-tarea`.
3.  **Desarrolla:** Código limpio + JSDoc.
4.  **Sube cambios:** `git push origin tipo/nombre-tarea`.
5.  **Crea el PR:** En GitHub, selecciona `develop` como rama de destino.
6.  **Atiende el Feedback:** Si el autor solicita cambios, corrígelos y vuelve a subir a la misma rama hasta que sea aprobado.

---

## 7. Estándares de Código
* **JSDoc:** Obligatorio para cada función y módulo.
* **Seguridad:** Prohibido subir archivos `.env` o credenciales.
* **Limpieza:** Cero `console.log` en el código final.

---
> "Un Pull Request es una conversación. El objetivo no es solo fusionar código, sino mejorar el proyecto en conjunto."