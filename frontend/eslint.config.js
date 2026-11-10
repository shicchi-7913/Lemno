import { fixupPluginRules } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import i18next from 'eslint-plugin-i18next';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactPackage from 'react/package.json' with { type: 'json' };
import tseslint from 'typescript-eslint';

const nativeElements = {
  h1: 'Heading',
  h2: 'Heading',
  h3: 'Heading',
  h4: 'Heading',
  h5: 'Heading',
  input: 'Input, Checkbox, or HiddenInput',
  select: 'Select',
  option: 'Select',
  optgroup: 'Select',
  textarea: 'Textarea',
  button: 'Button, ToggleButton, or ButtonBase',
  label: 'FormLabel',
  dialog: 'Modal',
  svg: 'Icon',
};

const forbidNativeElements = (allowed = []) => [
  'error',
  {
    forbid: Object.entries(nativeElements)
      .filter(([element]) => !allowed.includes(element))
      .map(([element, component]) => ({
        element,
        message: `Use the shared ${component} component instead.`,
      })),
  },
];

const nativeElementImplementations = [
  {
    files: [
      'src/shared/ui/Input/input.tsx',
      'src/shared/ui/Checkbox/checkbox.tsx',
      'src/shared/ui/HiddenInput/hidden-input.tsx',
    ],
    elements: ['input'],
  },
  { files: ['src/shared/ui/ButtonBase/button-base.tsx'], elements: ['button'] },
  { files: ['src/shared/ui/Select/select.tsx'], elements: ['select', 'option', 'optgroup'] },
  { files: ['src/shared/ui/Textarea/textarea.tsx'], elements: ['textarea'] },
  { files: ['src/shared/ui/FormLabel/form-label.tsx'], elements: ['label'] },
  { files: ['src/shared/ui/Modal/modal.tsx'], elements: ['dialog'] },
  { files: ['src/shared/ui/Icon/icon.tsx'], elements: ['svg'] },
  { files: ['src/shared/ui/Heading/heading.tsx'], elements: ['h1', 'h2', 'h3', 'h4', 'h5'] },
];

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
      'react/forbid-elements': forbidNativeElements(),
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
  // Only each primitive's implementation may render its native element.
  ...nativeElementImplementations.map(({ files, elements }) => ({
    files,
    rules: {
      'react/forbid-elements': forbidNativeElements(elements),
    },
  })),
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/ui/**/*.tsx', 'src/app/main.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'Place TSX files under a ui directory. Only src/app/main.tsx is exempt.',
        },
      ],
    },
  },
  {
    files: ['src/**/ui/**/*.ts'],
    ignores: ['src/**/ui/**/*.module.scss.d.ts', 'src/shared/ui/**/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            'Only public shared/ui index.ts files and CSS Module declarations may use .ts under ui.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.module.scss.d.ts'],
    ignores: ['src/**/ui/**/*.module.scss.d.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'Place CSS Module declarations under a ui directory.',
        },
      ],
    },
  },
  prettier,
]);
