import { jest } from '@jest/globals';

// 1. Mock de conexión simulada (necesario para db.js)
const mockConnection = {
    release: jest.fn(),
    query: jest.fn().mockResolvedValue([[]])
};

// 2. Mock del pool con comportamiento asíncrono correcto
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

// 3. Mocks de la capa de datos
jest.unstable_mockModule('../../models/user.model.js', () => ({
    UserModel: {
        findAllDynamic: jest.fn(),
        countDynamic: jest.fn()
    }
}));

// 3. Importaciones dinámicas
const { UserService } = await import('../../services/user.service.js');
const { UserModel } = await import('../../models/user.model.js');

describe('Suite Unitaria: UserService - getAllUsers', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Ruta de extracción plana (No Paginada)', () => {
        test('Debe evadir la paginación y retornar un arreglo plano si paginate es "false"', async () => {
            const mockData = [{ id: 1, name: 'User1' }];
            UserModel.findAllDynamic.mockResolvedValue(mockData);
            
            // Evaluamos con string 'false' para activar la condición
            const filters = Object.freeze({ paginate: 'false', role: 'admin' });
            const result = await UserService.getAllUsers(filters);

            expect(UserModel.findAllDynamic).toHaveBeenCalledWith(filters);
            expect(UserModel.countDynamic).not.toHaveBeenCalled();
            expect(result).toStrictEqual(mockData);
        });
    });

    describe('Rutas de extracción paginada (Cálculos de Offset y Meta)', () => {
        test('Debe aplicar valores por defecto (page 1, limit 10) si no se proveen', async () => {
            const mockUsers = [{ id: 1 }, { id: 2 }];
            UserModel.countDynamic.mockResolvedValue(5); 
            UserModel.findAllDynamic.mockResolvedValue(mockUsers);

            // Objeto vacío congelado para forzar los defaults y garantizar que no se mute
            const filters = Object.freeze({}); 
            const result = await UserService.getAllUsers(filters);

            // El Modelo debe recibir el nuevo objeto con las propiedades calculadas
            expect(UserModel.findAllDynamic).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            
            expect(result.data).toStrictEqual(mockUsers);
            expect(result.meta).toStrictEqual({
                currentPage: 1,
                lastPage: 1,
                itemsPerPage: 10,
                totalItems: 5,
                nextPage: null,
                prevPage: null
            });
        });

        test('Debe calcular correctamente el bloque central garantizando inmutabilidad del input', async () => {
            UserModel.countDynamic.mockResolvedValue(15);
            UserModel.findAllDynamic.mockResolvedValue([]);

            // CRÍTICO: Congelamos el objeto. Si el servicio intenta hacer filters.limit = X, la prueba fallará.
            const originalFilters = Object.freeze({ page: 2, limit: 5 }); 
            
            const result = await UserService.getAllUsers(originalFilters);

            // 1. Verificamos que el Modelo recibió el objeto CLONADO y correctamente calculado
            expect(UserModel.findAllDynamic).toHaveBeenCalledWith({ page: 2, limit: 5, offset: 5 });
            
            // 2. Verificamos que el objeto original sigue intacto (no tiene offset)
            expect(originalFilters).not.toHaveProperty('offset'); 
            
            // 3. Verificamos las matemáticas de la metadata
            expect(result.meta).toStrictEqual({
                currentPage: 2,
                lastPage: 3, 
                itemsPerPage: 5,
                totalItems: 15,
                nextPage: 3, 
                prevPage: 1  
            });
        });

        test('Debe forzar el parseo numérico si los parámetros llegan como cadenas de texto (Strings)', async () => {
            UserModel.countDynamic.mockResolvedValue(50);
            UserModel.findAllDynamic.mockResolvedValue([]);

            // Express suele entregar req.query como strings.
            const filters = Object.freeze({ page: '4', limit: '10' }); 
            const result = await UserService.getAllUsers(filters);

            // Validación de parseo numérico y cálculo de offset: (4 - 1) * 10 = 30
            expect(UserModel.findAllDynamic).toHaveBeenCalledWith({ page: '4', limit: 10, offset: 30 });
            
            expect(result.meta.currentPage).toBe(4);
            expect(result.meta.lastPage).toBe(5); 
            expect(result.meta.nextPage).toBe(5);
            expect(result.meta.prevPage).toBe(3);
        });
    });
});