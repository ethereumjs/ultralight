import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
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
		ignores: [
			"node_modules/",
			"dist/",
			"dist.browser/",
			"coverage/",
			"typedoc.js",
			"docs",
			"config/tsconfig.lint.json",
			"vitest.config.*.ts",
			"archived-browser-client/",
			"browser-client/",
			"ui/",
			"scripts/",
			"proxy/",
		],
		rules: {
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/restrict-template-expressions": "error",
			"@typescript-eslint/unbound-method": "error",
			"@typescript-eslint/strict-boolean-expressions": ["error"],
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/return-await": "error",
		},
	},
];
