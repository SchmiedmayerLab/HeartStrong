// This source file is part of the HeartStrong open-source project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT

import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import { siteConfig } from "./site.config.mjs";

export default defineConfig({
  output: "static",
  site: siteConfig.url,
  base: siteConfig.base,
  trailingSlash: "always",
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  vite: {
    server: {
      host: true,
    },
  },
});
