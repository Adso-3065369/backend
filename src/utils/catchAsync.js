/**
 * Envoltorio para atrapar errores en funciones asíncronas
 * y pasarlos automáticamente al middleware global de errores.
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    // Ejecutamos la función del controlador y si hay un error (.catch),
    // se lo pasamos a la función next() de Express
    fn(req, res, next).catch(next);
  };
};
