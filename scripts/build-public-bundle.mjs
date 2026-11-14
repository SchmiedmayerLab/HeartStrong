// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { resolve } from "node:path";
import { siteConfig } from "../site.config.mjs";
import { publishing } from "../publishing.config.mjs";
import { auditPublicBundle, buildPublicBundle } from "./lib/public-bundle.mjs";

const options = {
  inputDirectory: resolve("dist"),
  outputDirectory: resolve("_site"),
  manifestFile: resolve("release-manifest.json"),
  siteUrl: siteConfig.url,
  basePath: siteConfig.base,
  indexingEnabled: siteConfig.discovery.indexing,
  sourceCommit: process.env.GITHUB_SHA,
  policy: {
    publicPages: publishing.publicPages,
    entrypoints: [...publishing.publicPages, ...publishing.entrypoints],
    publicAssets: publishing.publicAssets,
    excludedFiles: publishing.excludedFiles,
    search: false,
  },
};
const audit = process.argv.includes("--audit");
const manifest =
  audit ?
    await auditPublicBundle({ ...options, directory: options.outputDirectory })
  : await buildPublicBundle(options);
process.stdout.write(
  `Public bundle ${audit ? "verified" : "built"}: ${manifest.files.length} files; ${manifest.excluded.length} excluded.\n`,
);
