module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'implicit-dependencies', 'prettier'],
  env: {
    es2020: true,
    node: true,
  },
  parserOptions: {

  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'dist.browser/',
    'coverage/',
    'prettier.config.cjs',
    'typedoc.js',
    'packages/discv5/',
    'docs',
    '.eslintrc.cjs',
    'scripts/'
  ],
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  rules: {
    "node/file-extension-in-import": [

      {
          "tryExtensions": [".js", ".json", ".node"],

      }
  ],
    'no-undef':'warn',
    'no-process-exit':'off',
    'node/no-unpublished-import':'off',
    'node/no-missing-import': 'off',
    'no-empty': 'off',
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'implicit-dependencies/no-implicit': ['error', { peer: true, dev: true, optional: true }],
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase', 'camelCase'],
      },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-unnecessary-condition': 'off',
    'no-dupe-class-members': 'off',
    'no-extra-semi': 'off',
    'prettier/prettier': 'error',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],
    'no-case-declarations': 'warn',
    "node/file-extension-in-import": ["error", "always"],
  },
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.lint.json',
  },
}
