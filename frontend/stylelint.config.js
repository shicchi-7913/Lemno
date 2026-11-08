import { relative, resolve } from 'node:path';

import stylelint from 'stylelint';

const ruleName = 'lemno/css-modules-in-ui';
const sourceRoot = resolve(import.meta.dirname, 'src');
const cssModulesInUi = (enabled) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, { actual: enabled, possible: [true] })) {
    return;
  }

  const file = root.source?.input.file;
  if (!file) return;

  const path = relative(sourceRoot, file);
  // Global styles, including src/app/styles.scss, are not CSS Modules.
  if (!path.endsWith('.module.scss') || path.split(/[\\/]/).includes('ui')) return;

  stylelint.utils.report({
    ruleName,
    result,
    node: root,
    message: 'Place CSS Modules under a ui directory.',
  });
};

export default {
  customSyntax: 'postcss-scss',
  plugins: [stylelint.createPlugin(ruleName, cssModulesInUi)],
  rules: {
    [ruleName]: true,
    'color-no-hex': true,
    'color-named': 'never',
    'rule-selector-property-disallowed-list': {
      '/\\bsvg\\b/': ['width', 'height'],
    },
    'declaration-property-value-allowed-list': {
      'font-size': [
        'inherit',
        '/^var\\(--font-size-(?:2xs|xs|sm|md|lg|xl|2xl|3xl)\\)$/',
        // Allow the shared size loop before Sass interpolation.
        'var(--font-size-#{$size})',
      ],
      font: ['inherit'],
      'font-weight': ['/^var\\(--font-weight-(?:regular|medium|semibold|bold)\\)$/'],
      // Include physical and logical corner properties as well as the shorthand.
      '/^border(?:-[a-z]+)*-radius$/': ['0', '/^var\\(--radius-(?:sm|md|lg|xl|pill|circle)\\)$/'],
    },
    'function-disallowed-list': [
      '/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)$/i',
    ],
  },
  overrides: [
    {
      files: ['src/shared/styles/colors.scss'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
};
