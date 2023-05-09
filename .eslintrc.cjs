module.exports = {
  parser: '@typescript-eslint/parser', // parse typescript
  env: {
    node: true,
    es6: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        trailingComma: 'es5',
        singleQuote: true,
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'], // parse typescript
      extends: ['plugin:@typescript-eslint/recommended'],
      plugins: ['@typescript-eslint'],
    },
  ],
};
