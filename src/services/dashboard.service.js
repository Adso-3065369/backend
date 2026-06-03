import { SaleModel } from '../models/sale.model.js';
import { ProductModel } from '../models/product.model.js';

/**
 * @file dashboard.service.js
 * @description Servicio encargado de agrupar y procesar las métricas para el panel principal.
 */
export const DashboardService = {
    
    getDashboardMetrics: async () => {
        const [
            salesStats,
            inventoryStats,
            criticalStock,
            salesPerMonth,
            topCategories
        ] = await Promise.all([
            SaleModel.getSalesStats(),
            ProductModel.getInventoryStats(),
            ProductModel.getCriticalStockCount(5),
            SaleModel.getSalesPerMonth(),
            SaleModel.getTopCategories()
        ]);

        return {
            summary: {
                totalRevenue: parseFloat(salesStats?.totalSalesRevenue || 0),
                totalSales: parseInt(salesStats?.totalSalesCount || 0),
                totalProducts: parseInt(inventoryStats?.totalProducts || 0),
                inventoryValue: parseFloat(inventoryStats?.inventoryValue || 0),
                criticalStockProducts: parseInt(criticalStock?.criticalStockCount || 0)
            },
            charts: {
                salesPerMonth: salesPerMonth || [],
                topCategories: topCategories || []
            }
        };
    }
};