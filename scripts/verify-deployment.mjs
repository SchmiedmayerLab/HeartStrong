// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const privatePaths = [
  ".git/config",
  ".env",
  ".github/workflows/pages.yml",
  "package.json",
  "src/pages/index.astro",
  "docs/DEPLOYMENT.md",
  "release-manifest.json",
  "CNAME",
];
const fail = (message) => {
  throw new Error(`Deployment verification: ${message}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function relativePath(path) {
  return (
    typeof path === "string" &&
    /^[A-Za-z0-9_./-]+$/.test(path) &&
    path.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

export function validateDeploymentManifest(
  manifest,
  expectedUrl,
  deploymentUrl,
  sourceCommit = "",
) {
  const expected = new URL(expectedUrl);
  const actual = new URL(deploymentUrl);
  if (
    expected.protocol !== "https:" ||
    expected.username ||
    expected.password ||
    expected.port ||
    expected.search ||
    expected.hash
  ) {
    fail(
      "the expected destination must be a default GitHub Pages or approved production HTTPS URL",
    );
  }
  if (actual.href !== expected.href)
    fail("the deployment URL does not match the approved destination");
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    manifest.origin !== expected.origin ||
    manifest.base !== expected.pathname.replace(/\/$/, "") ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length ||
    !Array.isArray(manifest.excluded)
  ) {
    fail("manifest schema or destination is invalid");
  }
  if (
    sourceCommit &&
    (!/^[a-f\d]{40,64}$/.test(sourceCommit) ||
      manifest.sourceCommit !== sourceCommit)
  ) {
    fail("manifest source commit does not match the deployment");
  }
  const selected = new Set();
  let totalBytes = 0;
  for (const file of manifest.files) {
    if (
      !file ||
      !relativePath(file.path) ||
      selected.has(file.path) ||
      /(^|\/)(?:\.|src(?:\/|$)|docs(?:\/|$)|scripts(?:\/|$)|tests(?:\/|$))/.test(
        file.path,
      ) ||
      /\.(?:map|md|ya?ml|astro)$/.test(file.path) ||
      privatePaths.includes(file.path) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    ) {
      fail(`invalid or nonpublic manifest file: ${file?.path}`);
    }
    selected.add(file.path);
    totalBytes += file.bytes;
  }
  if (!selected.has("index.html") || !selected.has("404.html"))
    fail("manifest requires home and error pages");
  if (!Number.isSafeInteger(totalBytes) || manifest.totalBytes !== totalBytes)
    fail("manifest byte total does not match its files");
  if (
    manifest.excluded.some((path) => !relativePath(path) || selected.has(path))
  )
    fail("invalid excluded path");
  return expected;
}

export async function verifyDeployment({
  manifest,
  expectedUrl,
  deploymentUrl,
  sourceCommit = "",
  fetchImpl = fetch,
  attempts = 8,
  delayMs = 5000,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
}) {
  const destination = validateDeploymentManifest(
    manifest,
    expectedUrl,
    deploymentUrl,
    sourceCommit,
  );
  if (
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > 12 ||
    !Number.isInteger(delayMs) ||
    delayMs < 0 ||
    delayMs > 10000
  ) {
    fail("retry settings exceed their bounded limits");
  }
  async function request(path, inspect) {
    const url = new URL(path, destination);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          redirect: "manual",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(10000),
        });
        if (response.status >= 300 && response.status < 400)
          fail(`redirect returned for ${path}`);
        if (response.url && response.url !== url.href)
          fail(`unexpected response URL for ${path}`);
        await inspect(response);
        return;
      } catch (error) {
        if (attempt + 1 === attempts) fail(`${path}: ${error.message}`);
        await sleep(delayMs);
      }
    }
  }

  // Bound request concurrency; verify actual bytes rather than trusting HTTP ETags.
  const pending = [...manifest.files];
  await Promise.all(
    Array.from({ length: Math.min(6, pending.length) }, async () => {
      while (pending.length) {
        const file = pending.shift();
        const route =
          file.path === "index.html" ?
            "./"
          : file.path.replace(/\/index\.html$/, "/");
        await request(route, async (response) => {
          if (
            response.status !== 200 &&
            !(file.path === "404.html" && response.status === 404)
          ) {
            fail(`HTTP ${response.status} for ${file.path}`);
          }
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length !== file.bytes || hash(bytes) !== file.sha256)
            fail(`checksum mismatch for ${file.path}`);
        });
      }
    }),
  );

  const excluded = [...new Set([...manifest.excluded, ...privatePaths])];
  for (const path of excluded) {
    await request(path, async (response) => {
      await response.body?.cancel();
      if (response.status !== 404)
        fail(
          `nonpublic path must return 404: ${path} (HTTP ${response.status})`,
        );
    });
  }
  return {
    url: destination.href,
    files: manifest.files.length,
    bytes: manifest.totalBytes,
    excluded: excluded.length,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const manifest = JSON.parse(await readFile("release-manifest.json", "utf8"));
  if (!process.env.SITE_URL || !process.env.DEPLOYMENT_URL)
    fail("SITE_URL and DEPLOYMENT_URL are required");
  const result = await verifyDeployment({
    manifest,
    expectedUrl: `${process.env.SITE_URL.replace(/\/$/, "")}${process.env.SITE_BASE || ""}/`,
    deploymentUrl: process.env.DEPLOYMENT_URL,
    sourceCommit: process.env.GITHUB_SHA || "",
  });
  process.stdout.write(
    `Verified ${result.files} public files (${result.bytes} bytes), the packaged HTML pages, and ${result.excluded} excluded paths at ${result.url}\n`,
  );
}
