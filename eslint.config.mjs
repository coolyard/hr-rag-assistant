import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '.claude/**',
      '.idea/**',
      '**/jest.config.ts',
      '**/vitest.config.ts',
    ],
  },
  {
    files: ['apps/api/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./apps/api/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./apps/web/tsconfig.json', './apps/web/tsconfig.node.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'import-x': importX,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
