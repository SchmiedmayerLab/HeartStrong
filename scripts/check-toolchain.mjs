// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const version = lock.packages["node_modules/@playwright/test"].version;
const workflow = read(".github/workflows/build-and-test.yml");
const images = [
  ...workflow.matchAll(
    /mcr\.microsoft\.com\/playwright:v([^\s]+)-noble@sha256:([a-f0-9]{64})/g,
  ),
];
assert.ok(
  images.length > 0,
  "Browser CI must use a digest-pinned Playwright image",
);
for (const image of images)
  assert.equal(
    image[1],
    version,
    "Update the browser image together with Playwright",
  );
assert.equal(
  read(".node-version").trim(),
  read(".nvmrc").trim(),
  "Node pins must agree",
);
assert.match(pkg.packageManager, /^npm@\d+\.\d+\.\d+$/);
assert.equal(
  lock.packages[""].devDependencies["@playwright/test"],
  pkg.devDependencies["@playwright/test"],
);
process.stdout.write(
  `Toolchain pins agree: Node ${read(".node-version").trim()}, ${pkg.packageManager}, Playwright ${version}\n`,
);
