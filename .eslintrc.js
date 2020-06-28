const path = require('path');

module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 10,
    project: "./tsconfig.json"
  },
  plugins: [
    "@typescript-eslint",
    "prettier"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "prettier/prettier": "error",
    //doesnt work, it reports false errors
    "constructor-super": "off",
    "@typescript-eslint/class-name-casing": "error",
    "@typescript-eslint/explicit-function-return-type": ["error", {
      "allowExpressions": true
    }],
    "@typescript-eslint/func-call-spacing": "error",
    "@typescript-eslint/interface-name-prefix": ["error", "always"],
    "@typescript-eslint/member-ordering": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/semi": "error",
    "@typescript-eslint/type-annotation-spacing": "error",
    "camelcase": "error",
    "func-call-spacing": "off",
    "max-len": ["error", {
      "code": 120
    }],
    "new-parens": "error",
    "no-caller": "error",
    "no-bitwise": "off",
    "no-console": "warn",
    "no-var": "error",
    "prefer-const": "error",
    "quotes": ["error", "double"]
  },
  "overrides": [
    {
      "files": ["**/test/**/*.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
};
