/**
 * @file validator.middleware.test.js
 * @description Suite de cobertura total para el middleware de validación dinámica de esquemas.
 */
import { jest } from '@jest/globals';

// Ajusta la ruta a la ubicación real de tu middleware
const { validateSchema } = await import('../../middlewares/validator.middleware.js');

describe('Suite Unitaria: validateSchema Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {}; 
        next = jest.fn();
    });

    test('1. Debe mutar req.body con los datos parseados y llamar a next() sin argumentos si es exitoso', () => {
        // 1. Estado inicial: Data cruda simulando la entrada del cliente
        req.body = { email: '   sanitized@test.com   ' }; 

        const mockSchema = {
            safeParse: jest.fn().mockReturnValue({
                success: true,
                // 2. Estado resultante: Data sanitizada por Zod (sin espacios)
                data: { email: 'sanitized@test.com' }
            })
        };

        const middleware = validateSchema(mockSchema);
        middleware(req, res, next);

        // 3. Aserción estricta: Zod debe recibir la data cruda original
        expect(mockSchema.safeParse).toHaveBeenCalledWith({ email: '   sanitized@test.com   ' });
        
        // 4. Aserción de mutación: El middleware debe sobrescribir req.body con la data sanitizada
        expect(req.body).toStrictEqual({ email: 'sanitized@test.com' });
        
        // 5. Verificación de propagación
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(); 
    });

    test('2. Debe estructurar los errores y delegar un Error 400 a next() si la validación falla', () => {
        const mockSchema = {
            safeParse: jest.fn().mockReturnValue({
                success: false,
                error: {
                    issues: [
                        { path: ['password'], message: 'String must contain at least 8 character(s)' }
                    ]
                }
            })
        };

        const middleware = validateSchema(mockSchema);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const errorArg = next.mock.calls[0][0];
        
        expect(errorArg).toBeInstanceOf(Error);
        expect(errorArg.message).toBe("Error de validación en los datos enviados");
        expect(errorArg.statusCode).toBe(400);
        expect(errorArg.errors).toStrictEqual([
            { field: 'password', message: 'String must contain at least 8 character(s)' }
        ]);
    });

    test('3. Debe interceptar la cadena "received undefined" y aplicar la traducción forzada', () => {
        const mockSchema = {
            safeParse: jest.fn().mockReturnValue({
                success: false,
                error: {
                    issues: [
                        { path: ['username'], message: 'Required, received undefined' }
                    ]
                }
            })
        };

        const middleware = validateSchema(mockSchema);
        middleware(req, res, next);

        const errorArg = next.mock.calls[0][0];
        // Valida la ejecución del bloque condicional de traducción
        expect(errorArg.errors[0].message).toBe("Este campo es obligatorio");
    });

    test('4. Debe asignar "body" como campo si el issue path está vacío (errores a nivel de esquema)', () => {
        const mockSchema = {
            safeParse: jest.fn().mockReturnValue({
                success: false,
                error: {
                    issues: [
                        // Un path vacío ocurre cuando el esquema completo es rechazado (ej. strict object recibe llaves extra)
                        { path: [], message: 'Unrecognized key(s) in object' }
                    ]
                }
            })
        };

        const middleware = validateSchema(mockSchema);
        middleware(req, res, next);

        const errorArg = next.mock.calls[0][0];
        // Valida la rama falsa del operador ternario `issue.path.length > 0 ? ... : "body"`
        expect(errorArg.errors[0].field).toBe("body");
    });
});