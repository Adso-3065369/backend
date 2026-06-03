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
  })

};