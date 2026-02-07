const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['dist', 'node_modules', '*.config.js', 'prisma/migrations'] },
  {
    extends: [
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript Hardening
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Console statements (allow warn/error, discourage log/debug)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Code quality
      'no-unused-vars': 'off', // Use TypeScript's version instead
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
);
