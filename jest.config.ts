/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // modulePaths: [`<rootDir>/test/utils`],
  setupFilesAfterEnv: ['./test/setup.ts'],
  coveragePathIgnorePatterns: ['./test/'],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};
