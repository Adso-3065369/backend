import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";
import { UserService } from "./user.service.js";

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
  }
};