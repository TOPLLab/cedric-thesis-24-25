import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";

export default [{
    files: ["**/*.*ts", "**/*.*js"],
}, {
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
                rootDir: "src",
                prefix: "@"
            }
        ],

        curly: "warn",
        eqeqeq: "error",
        "no-throw-literal": "warn",
        semi: "error",
    },
}];