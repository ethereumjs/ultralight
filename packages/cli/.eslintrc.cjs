module.exports = {
  extends: '../../config/eslint.cjs',
  rules: {
    // Everything the CLI does is via console
    'no-console': 'off',
  },
  parserOptions: {
    extraFileExtensions: ['.json'],
    sourceType: 'module',
    project: 'tsconfig.lint.json',
  },
}
