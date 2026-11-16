import tseslint from "typescript-eslint";

const sources = ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"];
const functionLines = { skipBlankLines: true, skipComments: true };

export default tseslint.config(
  { ignores: ["node_modules/**", "docs/**", "memories/**", ".claude/**", "eslint.config.js"] },
  {
    files: sources,
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
      "max-len": ["error", { code: 120, tabWidth: 2 }],
      "max-statements-per-line": ["error", { max: 1 }],
      "max-depth": ["error", 3],
      "no-nested-ternary": "error",
      "no-sequences": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true, "ts-check": true },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true, ignoreVoidReturningFunctions: true },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "max-lines-per-function": ["error", { max: 40, ...functionLines }],
    },
  },
  {
    files: ["**/*.spec.ts"],
    rules: { "max-lines-per-function": ["error", { max: 120, ...functionLines }] },
  },
);
