export default {
  customSyntax: 'postcss-scss',
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'declaration-property-value-allowed-list': {
      'font-size': [
        'inherit',
        '/^var\\(--font-size-(?:2xs|xs|sm|md|lg|xl|2xl|3xl)\\)$/',
        // Allow the shared size loop before Sass interpolation.
        'var(--font-size-#{$size})',
      ],
      font: ['inherit'],
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
