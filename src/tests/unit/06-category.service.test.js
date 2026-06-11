/**
 * @file 06-category.service.test.js
 * @description Prueba unitaria para getCategories de CategoryService.
 */
import { jest } from '@jest/globals';

// 1. Bloqueo de infraestructura (Evita ReferenceError de iconv-lite y fugas de DB)
const mockConnection = {
    release: jest.fn(),
    query: jest.fn().mockResolvedValue([[]])
};

const mockDbMethods = {
    query: jest.fn().mockResolvedValue([[]]),
    execute: jest.fn().mockResolvedValue([[]]),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    end: jest.fn()
};

jest.unstable_mockModule('mysql2/promise', () => ({
    default: {
        createPool: jest.fn(() => mockDbMethods),
        createConnection: jest.fn()
    },
    createPool: jest.fn(() => mockDbMethods),
    createConnection: jest.fn()
}));

jest.unstable_mockModule('mysql2', () => ({
    default: {
        createPool: jest.fn(() => ({ promise: () => mockDbMethods }))
    },
    createPool: jest.fn(() => ({ promise: () => mockDbMethods }))
}));

// 2. Aislamiento estricto de la base de datos
jest.unstable_mockModule('../../models/category.model.js', () => ({
    CategoryModel: {
        findAllDynamic: jest.fn(),
        countDynamic: jest.fn()
    }
}));

// 3. Importaciones dinámicas
const { CategoryService } = await import('../../services/category.service.js');
const { CategoryModel } = await import('../../models/category.model.js');

describe('Suite Unitaria: CategoryService - getCategories', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Ruta de extracción plana (No Paginada)', () => {
        test('Debe evadir la paginación y retornar un arreglo plano si paginate es "false"', async () => {
            const mockData = [{ id: 1, name: 'Electrónica' }];
            CategoryModel.findAllDynamic.mockResolvedValue(mockData);
            
            const filters = Object.freeze({ paginate: 'false', status: 'active' });
            const result = await CategoryService.getCategories(filters);

            expect(CategoryModel.findAllDynamic).toHaveBeenCalledWith(filters);
            expect(CategoryModel.countDynamic).not.toHaveBeenCalled();
            expect(result).toStrictEqual(mockData);
        });
    });

    describe('Rutas de extracción paginada', () => {
        test('Debe aplicar valores por defecto (page 1, limit 10) garantizando inmutabilidad', async () => {
            const mockCategories = [{ id: 1 }, { id: 2 }];
            CategoryModel.countDynamic.mockResolvedValue(5); 
            CategoryModel.findAllDynamic.mockResolvedValue(mockCategories);

            const filters = Object.freeze({}); 
            const result = await CategoryService.getCategories(filters);

            expect(CategoryModel.findAllDynamic).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            
            expect(result.data).toStrictEqual(mockCategories);
            expect(result.meta).toStrictEqual({
                currentPage: 1,
                lastPage: 1,
                itemsPerPage: 10,
                totalItems: 5,
                nextPage: null,
                prevPage: null
            });
        });

        test('Debe calcular correctamente el bloque central (offset y páginas)', async () => {
            CategoryModel.countDynamic.mockResolvedValue(22);
            CategoryModel.findAllDynamic.mockResolvedValue([]);

            const originalFilters = Object.freeze({ page: 3, limit: 5 }); 
            
            const result = await CategoryService.getCategories(originalFilters);

            // Verificamos que el Modelo recibe la data inyectada sin mutar el original
            expect(CategoryModel.findAllDynamic).toHaveBeenCalledWith({ page: 3, limit: 5, offset: 10 });
            expect(originalFilters).not.toHaveProperty('offset'); 
            
            expect(result.meta).toStrictEqual({
                currentPage: 3,
                lastPage: 5, // 22 / 5 = 4.4 -> ceil(4.4) = 5
                itemsPerPage: 5,
                totalItems: 22,
                nextPage: 4, 
                prevPage: 2  
            });
        });

        test('Debe forzar el parseo numérico si los parámetros llegan como cadenas de texto', async () => {
            CategoryModel.countDynamic.mockResolvedValue(50);
            CategoryModel.findAllDynamic.mockResolvedValue([]);

            const filters = Object.freeze({ page: '2', limit: '15' }); 
            const result = await CategoryService.getCategories(filters);

            // Validación: (2 - 1) * 15 = 15
            expect(CategoryModel.findAllDynamic).toHaveBeenCalledWith({ page: '2', limit: 15, offset: 15 });
            
            expect(result.meta.currentPage).toBe(2);
            expect(result.meta.lastPage).toBe(4); // ceil(50 / 15)
            expect(result.meta.nextPage).toBe(3);
            expect(result.meta.prevPage).toBe(1);
        });
    });
});