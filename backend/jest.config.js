module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['**/src/__tests__/**/*.test.ts'],
};