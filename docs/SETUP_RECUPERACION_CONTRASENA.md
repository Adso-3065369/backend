# 🔐 Guía de Configuración — Recuperación de Contraseña

> **Para:** Todos los integrantes del equipo  
> **Módulo:** Sistema de recuperación de contraseña por email  
> **Stack:** Node.js + Express + Nodemailer + Gmail

---

## ¿Qué hace esto?

Cuando un usuario olvida su contraseña, puede solicitar un enlace de recuperación. El sistema le enviará un correo con un link temporal (válido **15 minutos**) que lo lleva a un formulario para establecer una nueva contraseña.

---

## Paso 1 — Crear tu App Password de Gmail

> ⚠️ Cada integrante debe usar **su propio correo Gmail** y generar su propio App Password. NO compartan contraseñas de aplicación.

> ⚠️ Para poder crear un App Password, tu cuenta Gmail **debe tener activada la verificación en dos pasos**. Si no la tienes, actívala primero en https://myaccount.google.com/security

### Pasos:

1. Ve a https://myaccount.google.com/apppasswords
2. Si te pide, inicia sesión en tu cuenta Google
3. En el campo **"Nombre de la aplicación"**, escribe: `Inventario ADSO`
4. Haz clic en **"Crear"**
5. Google te mostrará una contraseña de **16 caracteres** (con espacios), así:

```
xxxx xxxx xxxx xxxx
```

6. **Cópiala inmediatamente** — solo se muestra una vez

---

## Paso 2 — Configurar el `.env` del backend

Copia el archivo `.env.example` a `.env` en la raíz del backend y completa estas variables:

```env
# Configuración de correo (Gmail + Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM="Sistema Inventario <tu_correo@gmail.com>"

# Recuperación de contraseña
JWT_RESET_SECRET=<genera uno con el comando de abajo>
JWT_RESET_EXPIRATION=15m
FRONTEND_URL=http://localhost:5173
```

### ¿Cómo generar el JWT_RESET_SECRET?

Ejecuta este comando en la terminal dentro de la carpeta `backend/`:

```bash
node -e "const c=require('crypto'); console.log(c.randomBytes(64).toString('hex'));"
```

Copia el resultado completo y pégalo como valor de `JWT_RESET_SECRET`.

> 💡 El `JWT_RESET_SECRET` puede ser cualquier string largo y aleatorio. No tiene que ser igual al de otro compañero.

---

## Paso 3 — Configurar el `.env` del frontend

Copia el archivo `.env.example` a `.env` en la raíz del frontend:

```env
VITE_API_URL=http://localhost:3000/api
```

> 💡 Si tu backend corre en un puerto diferente al `3000`, cámbialo aquí.

---

## Paso 4 — Verificar que todo funciona

1. Inicia el backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. En otra terminal, inicia el frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. En el navegador ve a `http://localhost:5173`
4. Haz clic en **"¿Olvidó su contraseña?"**
5. Ingresa un correo registrado en el sistema
6. Revisa tu bandeja de entrada — en menos de un minuto debe llegar el correo
7. Haz clic en el enlace → debe abrirte el formulario de nueva contraseña
8. Ingresa una contraseña válida y confirma

---

## Reglas de contraseña

| Regla | Detalle |
|---|---|
| Mínimo 8 caracteres | |
| Al menos 1 mayúscula | A–Z |
| Al menos 1 minúscula | a–z |
| Al menos 1 número | 0–9 |

**Ejemplo válido:** `Inventario2024`  
**Ejemplo inválido:** `inventario` ❌

---

## Solución de problemas comunes

### ❌ "Error de conexión" al pedir recuperación
- Verifica que el backend esté corriendo en el puerto `3000`
- Verifica que `VITE_API_URL` en el `.env` del frontend apunte al puerto correcto

### ❌ No llega el correo
- Revisa que `EMAIL_USER` y `EMAIL_PASSWORD` estén bien escritos en el `.env` del backend
- El App Password deben ser exactamente 16 caracteres (los espacios no importan)
- Revisa la **carpeta de spam**
- Confirma que tu cuenta Gmail tiene **verificación en dos pasos activa**

### ❌ "El enlace es inválido o ha expirado"
- El enlace es válido solo **15 minutos**. Solicita uno nuevo si ya pasó ese tiempo

### ❌ El JWT_SECRET u otras variables JWT están vacías
Ejecuta este comando para generar todos los secrets de una sola vez:

```bash
node -e "const c=require('crypto'); ['JWT_SECRET','JWT_REFRESH_SECRET','JWT_RESET_SECRET'].forEach(k => console.log(k+'='+c.randomBytes(64).toString('hex')));"
```

---

## Archivos que debes configurar (y los que NO debes tocar)

```
backend/
├── .env              ✅ TÚ debes completarlo
├── .env.example      📖 Referencia de variables requeridas

frontend/
├── .env              ✅ TÚ debes completarlo
├── .env.example      📖 Referencia de variables requeridas
```

**Archivos de código** — No modificar sin coordinación con el equipo:
- `backend/src/config/mailer.js`
- `backend/src/schemas/auth.schema.js`
- `backend/src/services/auth.service.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/routes/auth.routes.js`
- `frontend/src/modules/auth/ForgotPassword*.js`
- `frontend/src/modules/auth/ResetPassword*.js`
