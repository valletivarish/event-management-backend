import js from "@eslint/js";
import globals from "globals";

export default [
  { files: ["**/*.{js,mjs,cjs}"] },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-console": "off",
    },
  },
];
