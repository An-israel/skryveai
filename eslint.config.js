import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // supabase/functions is Deno code (Deno.env, npm: specifiers, no bundler) —
  // linting it with this project's browser-globals/React config produced
  // noise unrelated to either codebase. skryve-marketplace is an orphaned
  // Next.js-flavored fragment (next/headers-style server/client split) that
  // isn't wired into this Vite app's build at all.
  { ignores: ["dist", "supabase/functions", "skryve-marketplace"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
