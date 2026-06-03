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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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