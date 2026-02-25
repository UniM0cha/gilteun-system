import js from '@eslint/js';
import ts from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-useless-path-segments': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  { ignores: ['dist/', 'node_modules/', 'data/'] },
);
