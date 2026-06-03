import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // 1. Buscamos el token en la cabecera 'Authorization'
    const authHeader = req.headers.authorization;

    // 2. Validamos que el header exista y tenga el estándar "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Acceso denegado. Token no proporcionado o formato inválido");
      error.statusCode = 401; // 401: Unauthorized
      return next(error);
    }

    // 3. Extraemos solo el token (separamos la palabra "Bearer " del código mágico)
    const token = authHeader.split(" ")[1];

    // 4. Verificamos la firma criptográfica y la fecha de expiración
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Aquí es donde podrías hacer una consulta a UserModel.findById(decoded.id) 
    // para verificar si el usuario sigue "activo" en la base de datos o si fue eliminado/baneado.
    // Si no existe o está inactivo, lanzas un error 403 (Forbidden).

    // 5. ¡Concedido! Inyectamos los datos del usuario en la petición (req)
    req.user = decoded;

    // 6. Le decimos a Express que continúe hacia el controlador
    next();
  } catch (err) {
    // Interceptamos los errores específicos de la librería jsonwebtoken
    const error = new Error("Acceso denegado. Token inválido");
    error.statusCode = 401;

    // Le damos una pista súper útil al Frontend si el problema es que el tiempo se acabó
    if (err.name === "TokenExpiredError") {
      error.message = "El token ha expirado. Por favor inicie sesión nuevamente";
    }

    return next(error);
  }
};