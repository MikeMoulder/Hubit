import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // test/ is not app source: run-audit.js drives Chrome over CDP from plain Node CJS,
  // and capability-audit.js is a string injected into the page via Runtime.evaluate.
  // Neither is TypeScript, so the TS-flavoured module rules do not apply to them.
  {
    files: ["test/**/*.{js,mjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
