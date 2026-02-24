import solid from "eslint-plugin-solid/configs/typescript";
import * as tsParser from "@typescript-eslint/parser";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use Solidjs.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
	...baseConfig,
	{
		files: ["**/*.{ts,tsx}"],
		...solid,
		languageOptions: {
			parser: tsParser,
		},
	},
];
