import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
	{
		ignores: [
			"node_modules/",
			"coverage/",
			"typedoc.js",
			"docs/",
			"config/tsconfig.lint.json",
			"vitest.config.*.ts",
			"**/vite.config.ts",
			"**/scripts/**",
			"*.d.ts",
			"**/dist/**",
			"**/docs/**",
			"**/target/**"
		],
	},
	{
		files: [
			"packages/cli/**/*.ts",
			"packages/portalnetwork/**/*.ts",
			"packages/portal-client/**/*.ts",
		],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: "./tsconfig.lint.json",
				extraFileExtensions: [".json"],
				tsconfigRootDir: import.meta.dirname,
			},
			ecmaVersion: 2020,
			sourceType: "module",
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		
		rules: {
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/strict-boolean-expressions": ["error"],
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/return-await": "error",
		},
	},
];
