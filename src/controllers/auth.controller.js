import { AuthService } from "../services/auth.service.js";
import { successResponse } from "../utils/response.handler.js"; 
import { catchAsync } from "../utils/catchAsync.js"; 

export const AuthController = {
  
  register: catchAsync(async (req, res) => {
    const { name, email, password } = req.body;
    const user = await AuthService.registerUser(name, email, password);
    return successResponse(res, 201, "Usuario registrado exitosamente", user);
  }),

  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const data = await AuthService.loginUser(email, password);
    return successResponse(res, 200, "Inicio de sesión exitoso", data);
  }),

  refreshToken: catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const data = await AuthService.refreshAccessToken(refreshToken);
    return successResponse(res, 200, "Token renovado exitosamente", data);
  }),

  forgotPassword: catchAsync(async (req, res) => {
    const { email } = req.body;
    await AuthService.forgotPassword(email);
    // Siempre 200 para no revelar si el correo existe o no
    return successResponse(res, 200, "Si el correo existe, recibirás un enlace de recuperación.", {});
  }),

  resetPassword: catchAsync(async (req, res) => {
    const { token, password } = req.body;
    await AuthService.resetPassword(token, password);
    return successResponse(res, 200, "Contraseña actualizada correctamente.", {});
  })

};
