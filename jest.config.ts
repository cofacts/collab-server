/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // modulePaths: [`<rootDir>/test/utils`],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};
