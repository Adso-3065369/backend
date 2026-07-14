import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";
import { UserService } from "./user.service.js";
import { sendMail } from "../config/mailer.js";


export const AuthService = {
  /**
   * Registra un nuevo usuario aplicando encriptación de contraseña.
   */
  registerUser: async (name, email, password) => {
    // 1. Validar unicidad
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      const error = new Error("Error de validación en los datos enviados");
      error.statusCode = 400;
      error.errors = [{ field: "email", message: "Este correo ya se encuentra registrado." }];
      throw error;
    }

    // 2. Seguridad: Encriptación de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Persistencia
    const newUser = await UserModel.create({
      name,
      email,
      password: hashedPassword,
    });

    // 4. Limpieza de datos (Data Sanitization)
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  /**
   * Autentica un usuario y genera sus pasaportes (Tokens).
   */
  loginUser: async (email, password) => {
    // 1. Verificar existencia
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const error = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    // 2. Verificar la contraseña matemáticamente
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    // 3. Generar los Tokens usando Variables de Entorno parametrizadas
    const accessToken = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION || "15m" } 
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d" }
    );

    // 4. Persistir el Refresh Token
    await UserModel.updateRefreshToken(user.id, refreshToken);

    // 5. Preparar datos limpios para el Frontend
    const { password: _, refresh_token: __, ...userWithoutSensitiveData } = user;
    
    // 6. Solicitamos los roles estructurados al Servicio
    const rolesAndPermissions = await UserService.getUserRolesAndPermissions(user.id);

    return {
      user: { ...userWithoutSensitiveData, roles: rolesAndPermissions },
      accessToken,
      refreshToken
    };
  },

/**
   * Renueva el Access Token validando la autenticidad del Refresh Token.
   */
  refreshAccessToken: async (tokenFromClient) => {
    let decoded;

    // ====================================================================
    // BLOQUE 1: Validación Criptográfica y Estructural
    // ====================================================================
    try {
      // Si el token expira, está mal firmado o es basura sintáctica, fallará aquí.
      decoded = jwt.verify(tokenFromClient, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      // Cualquier excepción en esta fase es automáticamente un fallo de seguridad (401).
      const error = new Error("El token de refresco es inválido, está malformado o ha expirado.");
      error.statusCode = 401;
      throw error;
    }

    // ====================================================================
    // BLOQUE 2: Validación de Negocio e Infraestructura de Base de Datos
    // ====================================================================
    try {
      const user = await UserModel.findById(decoded.id);

      if (!user || user.refresh_token !== tokenFromClient) {
        const error = new Error("Token de refresco inválido o revocado por otra sesión.");
        error.statusCode = 401;
        throw error;
      }

      const newAccessToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || "15m" }
      );

      return { accessToken: newAccessToken };

    } catch (err) {
      // Respetamos el 401 si lo lanzamos nosotros mismos arriba
      if (err.statusCode === 401) throw err;

      // Si el código llega hasta aquí, la base de datos realmente se cayó o no responde (500 verdadero)
      const error = new Error("Fallo de conexión al validar la sesión. Intente nuevamente.");
      error.statusCode = 500;
      throw error;
    }
  },

  /**
   * Genera un token de reset y envía el correo de recuperación.
   * @param {string} email - Correo del usuario.
   */
  forgotPassword: async (email) => {
    const user = await UserModel.findByEmail(email);

    // Validar que el correo esté registrado antes de intentar enviar el enlace
    if (!user) {
      const error = new Error("El correo ingresado no está registrado en el sistema.");
      error.statusCode = 404;
      throw error;
    }

    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_RESET_SECRET,
      { expiresIn: process.env.JWT_RESET_EXPIRATION || '15m' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/#/restablecer-contrasena?token=${resetToken}`;

    await sendMail({
      to: user.email,
      subject: 'Recuperación de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Recuperación de contraseña</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #6d28d9; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 8px; font-size: 16px;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Este enlace expira en <strong>15 minutos</strong>.<br>
            Si no solicitaste esto, ignora este correo.
          </p>
        </div>
      `,
    });
  },

  /**
   * Verifica el token de reset y actualiza la contraseña en la BD.
   * @param {string} token - JWT de reset recibido del frontend.
   * @param {string} newPassword - Nueva contraseña en texto plano.
   */
  resetPassword: async (token, newPassword) => {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    } catch (err) {
      const error = new Error('El enlace de recuperación es inválido o ha expirado.');
      error.statusCode = 400;
      throw error;
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await UserModel.updatePassword(user.id, hashedPassword);
  },
};