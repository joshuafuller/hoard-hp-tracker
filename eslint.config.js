import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Playwright e2e specs use @playwright/test types (test, expect) that clash
  // with the vitest globals declared in tsconfig "types". Exclude them from the
  // main eslint pass; they are still type-checked by playwright.config.ts's own
  // tsconfig reference (tsconfig.e2e.json).
  { ignores: ["dist", "dev-dist", "coverage", "e2e/**", "playwright.config.ts"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
