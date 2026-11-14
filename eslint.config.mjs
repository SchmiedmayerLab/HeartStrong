// This source file is part of the HeartStrong open-source project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT

import * as groveConfigurations from "@schmiedmayerlab/grove-configurations";
import { configs as astroConfigs } from "eslint-plugin-astro";
import globals from "globals";

const { getEslintNodeConfig } = groveConfigurations;

export default [
  {
    files: ["scripts/**/*.mjs", "site.config.mjs", "publishing.config.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: [".astro/**", "_site/**", "release-manifest.json"],
  },
  {
    settings: {
      "import-x/core-modules": [
        "astro:assets",
        "astro:content",
        "astro:env/client",
        "astro:env/server",
        "astro:transitions",
      ],
    },
  },
  ...getEslintNodeConfig({
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
  },
  {
    files: ["astro.config.mjs", "eslint.config.mjs", ".prettierrc.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...astroConfigs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["src/scripts/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,astro}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.astro"],
    rules: {
      "astro/no-set-html-directive": "error",
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      // Empty strings in content and configuration fields mean "not provided".
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true } },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Tests read parsed JSON and DOM nodes whose shape the assertions verify,
      // stub asynchronous interfaces, and use insecure URLs as rejected input.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/require-await": "off",
      "sonarjs/no-clear-text-protocols": "off",
    },
  },
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      // Playwright skips here are conditional on the browser project or site content.
      "sonarjs/no-skipped-tests": "off",
    },
  },
  {
    files: ["vitest.config.ts"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
];
