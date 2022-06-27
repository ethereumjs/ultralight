module.exports = {
  extends: "../../config/eslint.cjs",
  ignorePatterns: ["*.js", "serviceWorker.ts", "index.ts"],
  rules: {
  },
  env: {
    browser: true
  },
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
}
