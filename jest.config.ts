/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // modulePaths: [`<rootDir>/test/utils`],
  setupFilesAfterEnv: ['./test/setup.ts'],
  coveragePathIgnorePatterns: ['./test/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
      },
    ],
  },
};
