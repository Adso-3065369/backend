import { DashboardService } from "../services/dashboard.service.js";
import { successResponse } from "../utils/response.handler.js";
import { catchAsync } from "../utils/catchAsync.js";

/**
 * @file dashboard.controller.js
 * @description Controlador estandarizado para la vista general (Dashboard).
 */
export const DashboardController = {
    
    getMetrics: catchAsync(async (req, res) => {
        const metrics = await DashboardService.getDashboardMetrics();

        return successResponse(
            res, 
            200, 
            "Métricas del panel de control recuperadas exitosamente", 
            metrics
        );
    })
    
};