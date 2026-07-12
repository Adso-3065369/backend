// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {}, // Impide que Jest intente transformar código con Babel
  coverageProvider: 'v8', // CRÍTICO: Usa el motor nativo de Node para ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};