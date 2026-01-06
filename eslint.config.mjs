// ESLint 9 Flat Config
import tseslint from 'typescript-eslint';
import reactRefresh from 'eslint-plugin-react-refresh';
import configPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'dist-electron/**', 'out/**', 'node_modules/**', '_backup/**', 'gilteun-system-ui-mockup.tsx', 'public/sw.js'],
  },
  // TypeScript ESLint recommended
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/utils/performanceBenchmark.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  configPrettier,
];
