import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import turboPlugin from "eslint-plugin-turbo";


/** @type {import("eslint").Linter.Config[]} */
export const config = [
    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        plugins: {
            turbo: turboPlugin,
        }
    },
    {
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            curly: "warn",
            eqeqeq: "error",
            "no-throw-literal": "warn",
            semi: "error",

            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
        },
    },
];
