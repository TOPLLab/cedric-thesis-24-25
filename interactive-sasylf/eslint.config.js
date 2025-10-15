import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslint from '@eslint/js'
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import tseslint from 'typescript-eslint'
import path from 'path'
import { fileURLToPath } from 'url'


export const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "no-relative-import-paths": noRelativeImportPaths,
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
        },

        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            "no-relative-import-paths/no-relative-import-paths": [
                "error",
                {
                    rootDir: "src/",
                    prefix: "@/"
                }
            ],

            curly: "warn",
            eqeqeq: "error",
            "no-throw-literal": "warn",
            semi: "error",
        },
    },

    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {},
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
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
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        },
    },

    // Overrides for configurations
    {
        files: [
            '**/*.config.js',
            '**/*.config.ts',
            '**/*.config.mjs',
            '**/*.config.cjs',
        ],
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                JSX: true,
            },
        },
        plugins: {},
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'import/no-default-export': 'off',
            'no-undef': 'off',
            'no-relative-import-paths/no-relative-import-paths': 'off',
        },
    },

];
