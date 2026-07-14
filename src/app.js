import express from "express";
import cors from 'cors';
import "./config/db.js";
import {
  authRouter,
  roleRouter,
  permissionRouter,
  categoryRouter,
  productRouter,
  userRouter,
  dashboardRouter,
  clientRouter
} from "./routes/index.js";

// 1. Importamos nuestro manejador global
import { globalErrorHandler } from "./middlewares/index.js";
import salesRouter from "./routes/sales.routes.js";

const app = express();

// Desactivamos la generación de ETags para que Express nunca genere respuestas 304 con cuerpo vacío.
// Sin ETags, cada petición a la API siempre recibe una respuesta 200 con el cuerpo completo de datos.
app.set('etag', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuramos CORS para permitir peticiones desde el frontend local durante el desarrollo.
app.use(cors());

// Middleware global que inyecta cabeceras de caché en TODAS las respuestas de la API.
// Cache-Control: no-store — impide que el navegador o proxies intermedios almacenen la respuesta.
// Pragma: no-cache — compatibilidad retroactiva con clientes HTTP/1.0 más antiguos.
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Saludo de la API",
    data: [],
    errors: [],
  });
})

app.use("/api/auth", authRouter);
app.use("/api/permissions", permissionRouter);
app.use("/api/roles", roleRouter);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/users", userRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/clients", clientRouter);
app.use("/api/sales", salesRouter);

// 2. Conectamos el Middleware Global de Errores al final de todas las rutas
app.use(globalErrorHandler);

export default app;