module.exports = {
  extends: "../../config/eslint.cjs",
  ignorePatterns: ["*.js", "serviceWorker.ts", "index.ts"],
  rules: {
    "node/file-extension-in-import": "off"
  },
  env: {
    browser: true
  },
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
}
