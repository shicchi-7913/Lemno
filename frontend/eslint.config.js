import { fixupPluginRules } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import i18next from 'eslint-plugin-i18next';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactPackage from 'react/package.json' with { type: 'json' };
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    // eslint-plugin-import 2.32 still uses token APIs removed in ESLint 10.
    plugins: { import: fixupPluginRules(importPlugin) },
    settings: {
      'import/internal-regex': '^@/shared/',
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          named: { import: true, types: 'mixed' },
          pathGroups: [
            {
              pattern: '*.module.{css,scss,sass}',
              patternOptions: { matchBase: true },
              group: 'index',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external'],
          distinctGroup: true,
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: { '@typescript-eslint': tseslint.plugin, i18next, react },
    settings: {
      react: { version: reactPackage.version },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'react/no-multi-comp': 'error',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: ['^(placeholder|title|alt|aria-label)$'],
          },
        },
      ],
    },
  },
  prettier,
]);
