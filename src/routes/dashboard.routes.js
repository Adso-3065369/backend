import { Router } from "express";

// Importación de middlewares de seguridad (Auth y RBAC)
import { 
    verifyToken,
    checkPermission  
} from "../middlewares/index.js";
import { DashboardController } from "../controllers/dashboard.controller.js";


export const dashboardRouter = Router();

/**
 * @route GET /api/dashboard/metrics
 * @description Obtiene todas las métricas consolidadas (tarjetas y gráficas) para el panel de control.
 * @access Privado (Requiere autenticación y el permiso 'dashboard.index')
 */
dashboardRouter.get(
    "/metrics",
    verifyToken,                      
    checkPermission('dashboard.index'),
    DashboardController.getMetrics
);