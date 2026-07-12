import { AuthService } from "../services/auth.service.js";
import { successResponse } from "../utils/response.handler.js"; 
import { catchAsync } from "../utils/catchAsync.js"; 

export const AuthController = {
  
  register: catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
      const user = await AuthService.registerUser(name, email, password);
      return successResponse(res, 201, "Usuario registrado exitosamente", user);
    } catch (error) {
      return next(error); // Pasamos el error al manejador global de Express
    }
  }),

  login: catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const data = await AuthService.loginUser(email, password);
      return successResponse(res, 200, "Inicio de sesión exitoso", data);
    } catch (error) {
      return next(error);
    }
  }),

  refreshToken: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    
    try {
      const data = await AuthService.refreshAccessToken(refreshToken);
      return successResponse(res, 200, "Token renovado exitosamente", data);
    } catch (error) {
      return next(error);
    }
  }),

  forgotPassword: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    try {
      await AuthService.forgotPassword(email);
      // Siempre 200 para no revelar si el correo existe o no
      return successResponse(res, 200, "Si el correo existe, recibirás un enlace de recuperación.", {});
    } catch (error) {
      return next(error);
    }
  }),

  resetPassword: catchAsync(async (req, res, next) => {
    const { token, password } = req.body;
    try {
      await AuthService.resetPassword(token, password);
      return successResponse(res, 200, "Contraseña actualizada correctamente.", {});
    } catch (error) {
      return next(error);
    }
  }),

};