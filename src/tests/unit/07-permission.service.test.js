/**
 * @file permission.service.test.js
 * @description Prueba unitaria estricta para PermissionService.
 */
import { jest } from '@jest/globals';

// 1. Bloqueo de infraestructura para prevenir inicializaciones accidentales del driver
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

// 2. Mock absoluto de la capa de datos (Ajusta los ../ según la ubicación de tu archivo)
jest.unstable_mockModule('../../models/permission.model.js', () => ({
    PermissionModel: {
        findAll: jest.fn()
    }
}));

// 3. Importaciones dinámicas bajo entorno ESM
const { PermissionService } = await import('../../services/permission.service.js');
const { PermissionModel } = await import('../../models/permission.model.js');

describe('Suite Unitaria: PermissionService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('[getAllPermissions] - Extracción del catálogo de permisos', () => {
        
        test('1. Debe invocar al modelo y retornar el arreglo de permisos sin mutaciones', async () => {
            const mockPermissions = [
                { id: 1, name: 'Crear Usuario', code: 'USER_CREATE' },
                { id: 2, name: 'Borrar Usuario', code: 'USER_DELETE' }
            ];
            
            // Forzamos la respuesta del mock
            PermissionModel.findAll.mockResolvedValue(mockPermissions);

            const result = await PermissionService.getAllPermissions();

            // Aserciones de comportamiento y estructura
            expect(PermissionModel.findAll).toHaveBeenCalledTimes(1);
            expect(PermissionModel.findAll).toHaveBeenCalledWith(); // Asegura que no se inyectan argumentos fantasma
            expect(result).toStrictEqual(mockPermissions);
        });

        test('2. Debe propagar la excepción hacia el controlador si la consulta a la BD falla', async () => {
            const dbError = new Error('Timeout de conexión a la base de datos');
            
            // Simulamos el colapso del modelo
            PermissionModel.findAll.mockRejectedValue(dbError);

            // Se valida que el error no sea silenciado internamente por el servicio
            await expect(PermissionService.getAllPermissions()).rejects.toThrow(dbError);
            
            expect(PermissionModel.findAll).toHaveBeenCalledTimes(1);
        });
    });
});