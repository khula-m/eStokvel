module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};