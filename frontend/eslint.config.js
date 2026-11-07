import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import i18next from 'eslint-plugin-i18next';
import react from 'eslint-plugin-react';
import reactPackage from 'react/package.json' with { type: 'json' };
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: { i18next, react },
    settings: {
      react: { version: reactPackage.version },
    },
    rules: {
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
