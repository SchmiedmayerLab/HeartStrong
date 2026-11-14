// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "parse5";
import { siteConfig } from "../site.config.mjs";
import { publishing } from "../publishing.config.mjs";

const root = resolve(process.env.SITE_OUTPUT_DIR || "dist");
const home = new URL(`${siteConfig.base}/`, siteConfig.url);
const files = new Set(await readdir(root, { recursive: true }));
const pages = new Map();
function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) walk(child, callback);
}
for (const name of publishing.publicPages) {
  const source = await readFile(resolve(root, name), "utf8");
  const ids = new Set();
  const refs = [];
  let main = 0;
  let heading = 0;
  const canonical = [];
  walk(parse(source), (node) => {
    const attrs = Object.fromEntries(
      (node.attrs ?? []).map(({ name, value }) => [name, value]),
    );
    if (attrs.id) {
      assert.ok(!ids.has(attrs.id), `Duplicate ID in ${name}: ${attrs.id}`);
      ids.add(attrs.id);
    }
    if (node.tagName === "main") main++;
    if (node.tagName === "h1") {
      let hidden = false;
      for (let parent = node; parent; parent = parent.parentNode) {
        hidden ||= (parent.attrs ?? []).some(
          ({ name, value }) =>
            name === "hidden" || (name === "aria-hidden" && value === "true"),
        );
      }
      if (!hidden) heading++;
    }
    if (node.tagName === "link" && attrs.rel === "canonical")
      canonical.push(attrs.href);
    for (const key of ["href", "src", "poster"])
      if (attrs[key]) refs.push(attrs[key]);
  });
  assert.equal(main, 1, `Expected one main landmark in ${name}`);
  assert.equal(heading, 1, `Expected one primary heading in ${name}`);
  const route = name === "index.html" ? "" : name.replace(/index\.html$/, "");
  assert.deepEqual(canonical, [new URL(route, home).href]);
  pages.set(name, { ids, refs, route });
}
for (const [name, { refs, route }] of pages) {
  for (const raw of refs) {
    if (/^(?:mailto:|tel:|data:|blob:)/i.test(raw)) continue;
    assert.ok(!/^javascript:/i.test(raw), `Unsafe link in ${name}`);
    const url = new URL(raw, new URL(route, home));
    if (url.origin !== home.origin) continue;
    assert.ok(
      url.pathname.startsWith(home.pathname),
      `Link escapes base in ${name}: ${raw}`,
    );
    const path = decodeURIComponent(url.pathname.slice(home.pathname.length));
    const target = [
      path,
      `${path}${path.endsWith("/") || !path ? "" : "/"}index.html`,
    ].find(
      (p) => files.has(p) && (p.includes(".") || p.endsWith("index.html")),
    );
    assert.ok(target, `Missing local target in ${name}: ${raw}`);
    if (url.hash && pages.has(target))
      assert.ok(
        pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1))),
        `Missing fragment in ${name}: ${raw}`,
      );
  }
}
process.stdout.write(`Built-site audit passed: ${pages.size} public pages.\n`);
