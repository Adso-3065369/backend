import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { registerSchema, loginSchema, refreshTokenSchema, resetPasswordSchema } from "../schemas/auth.schema.js";


export const authRouter = Router();

// ==========================================
// Rutas Públicas de Autenticación
// ==========================================

// Registrar un nuevo usuario
authRouter.post(
  "/register", 
  validateSchema(registerSchema), 
  AuthController.register
);

// Iniciar sesión (Generación de Tokens)
authRouter.post(
  "/login", 
  validateSchema(loginSchema), 
  AuthController.login
);

// ==========================================
// Rutas de Mantenimiento de Sesión
// ==========================================

// Renovar el Access Token caducado
authRouter.post(
  "/refresh", 
  validateSchema(refreshTokenSchema), 
  AuthController.refreshToken
);

// ==========================================
// Rutas de Recuperación de Contraseña
// ==========================================

// Solicitar enlace de recuperación por email
authRouter.post("/forgot-password", AuthController.forgotPassword);

// Restablecer contraseña con el token recibido por email
authRouter.post("/reset-password", validateSchema(resetPasswordSchema), AuthController.resetPassword);
