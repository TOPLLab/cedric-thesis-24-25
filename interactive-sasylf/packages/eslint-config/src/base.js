import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import turboPlugin from "eslint-plugin-turbo";


/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        plugins: {
            turbo: turboPlugin,
        }
    },
    {
        ignores: ["dist/"],
    },
    {
        files: ["*.js", "*.jsx", "*.ts", "*.tsx"],
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            curly: "warn",
            eqeqeq: "error",
            "no-throw-literal": "warn",
            semi: "error",
        },
    },

    {
        files: ['*.ts', '*.tsx'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/no-unused-vars': [
                'error',
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
