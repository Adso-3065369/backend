/**
 * @file dashboard.service.test.js
 * @description Suite unitaria para DashboardService.
 * Valida la concurrencia de promesas, parseo de tipos y manejo de valores nulos.
 */
import { jest } from '@jest/globals';

// 1. Mocks de la capa de acceso a datos ANTES de la importación
jest.unstable_mockModule('../../models/sale.model.js', () => ({
    SaleModel: {
        getSalesStats: jest.fn(),
        getSalesPerMonth: jest.fn(),
        getTopCategories: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/product.model.js', () => ({
    ProductModel: {
        getInventoryStats: jest.fn(),
        getCriticalStockCount: jest.fn()
    }
}));

// 2. Importación dinámica del servicio y los mocks
const { DashboardService } = await import('../../services/dashboard.service.js');
const { SaleModel } = await import('../../models/sale.model.js');
const { ProductModel } = await import('../../models/product.model.js');

describe('Suite Unitaria: DashboardService', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('1. Debe consolidar las métricas correctamente cuando todos los modelos retornan datos válidos', async () => {
        // Simulamos retornos en formato string, típico de consultas SQL con sumatorias
        SaleModel.getSalesStats.mockResolvedValue({ totalSalesRevenue: '1500.50', totalSalesCount: '45' });
        ProductModel.getInventoryStats.mockResolvedValue({ totalProducts: '120', inventoryValue: '5400.75' });
        ProductModel.getCriticalStockCount.mockResolvedValue({ criticalStockCount: '8' });
        
        const mockSalesPerMonth = [{ month: 1, revenue: 500 }];
        const mockTopCategories = [{ category_name: 'Electrónica', sales_count: 20 }];
        
        SaleModel.getSalesPerMonth.mockResolvedValue(mockSalesPerMonth);
        SaleModel.getTopCategories.mockResolvedValue(mockTopCategories);

        const result = await DashboardService.getDashboardMetrics();

        // Validaciones de ejecución concurrente
        expect(ProductModel.getCriticalStockCount).toHaveBeenCalledWith(5);
        expect(SaleModel.getSalesStats).toHaveBeenCalledTimes(1);

        // Validaciones estructurales y de casteo de tipos (String -> Number)
        expect(result.summary.totalRevenue).toBe(1500.50);
        expect(result.summary.totalSales).toBe(45);
        expect(result.summary.totalProducts).toBe(120);
        expect(result.summary.inventoryValue).toBe(5400.75);
        expect(result.summary.criticalStockProducts).toBe(8);
        
        // Validaciones de matrices
        expect(result.charts.salesPerMonth).toStrictEqual(mockSalesPerMonth);
        expect(result.charts.topCategories).toStrictEqual(mockTopCategories);
    });

    test('2. Debe aplicar los fallbacks (0 y []) cuando los modelos retornan null o undefined', async () => {
        // Simulamos ausencia total de datos (tablas vacías)
        SaleModel.getSalesStats.mockResolvedValue(null);
        ProductModel.getInventoryStats.mockResolvedValue(undefined);
        ProductModel.getCriticalStockCount.mockResolvedValue({}); // Objeto sin la llave esperada
        SaleModel.getSalesPerMonth.mockResolvedValue(null);
        SaleModel.getTopCategories.mockResolvedValue(undefined);

        const result = await DashboardService.getDashboardMetrics();

        // Verificamos que el operador || y ?. prevengan la propagación de NaN o crashes
        expect(result.summary.totalRevenue).toBe(0);
        expect(result.summary.totalSales).toBe(0);
        expect(result.summary.totalProducts).toBe(0);
        expect(result.summary.inventoryValue).toBe(0);
        expect(result.summary.criticalStockProducts).toBe(0);

        expect(result.charts.salesPerMonth).toStrictEqual([]);
        expect(result.charts.topCategories).toStrictEqual([]);
    });

    test('3. Debe propagar la excepción si alguna de las promesas concurrentes falla', async () => {
        const dbError = new Error('Conexión perdida');
        
        // Rompemos una de las consultas
        SaleModel.getSalesStats.mockRejectedValue(dbError);
        ProductModel.getInventoryStats.mockResolvedValue({ totalProducts: '10' });
        ProductModel.getCriticalStockCount.mockResolvedValue({ criticalStockCount: '1' });
        SaleModel.getSalesPerMonth.mockResolvedValue([]);
        SaleModel.getTopCategories.mockResolvedValue([]);

        // La aserción valida que la falla en una promesa tumba todo el Promise.all,
        // garantizando que el controlador reciba el error.
        await expect(DashboardService.getDashboardMetrics()).rejects.toThrow(dbError);
    });
});