// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import { parse } from "parse5";

const omittedExports = new Set();
const pagefindRuntime = new Set([
  "pagefind/pagefind.js",
  "pagefind/pagefind-worker.js",
  "pagefind/pagefind-entry.json",
  "pagefind/pagefind-component-ui.js",
  "pagefind/pagefind-component-ui.css",
]);
const unusedPagefind = new Set([
  "pagefind/pagefind-highlight.js",
  "pagefind/pagefind-ui.js",
  "pagefind/pagefind-ui.css",
  "pagefind/pagefind-modular-ui.js",
  "pagefind/pagefind-modular-ui.css",
]);
const pagefindData =
  /^pagefind\/(?:pagefind\.[\w-]+\.pf_meta|wasm\.[\w-]+\.pagefind|(?:index|fragment|filter)\/[\w-]+\.pf_(?:index|fragment|filter))$/;
const astroAsset =
  /^_astro\/[\w.-]+\.(?:js|css|png|jpe?g|webp|avif|svg|woff2?|ico)$/;
const textExtension =
  /\.(?:html|css|js|json|xml|txt|webmanifest|bib|svg|license)$/;
const forbiddenKeys = new Set([
  "draft",
  "sample",
  "featured",
  "scholarEligible",
  "templateMode",
  "programArc",
  "stages",
  "cff",
  "cffSha256",
  "sourcePath",
  "currentPositionSource",
  "currentPositionUpdated",
]);
const recordKeys = new Set([
  "type",
  "id",
  "title",
  "description",
  "name",
  "role",
  "group",
  "endMonth",
  "profile",
  "currentPosition",
  "orcid",
  "interests",
  "research",
  "citationKey",
  "authors",
  "editors",
  "updated",
  "dateModified",
  "eventStart",
  "eventEnd",
  "datePublished",
  "publicationType",
  "venue",
  "doi",
  "keywords",
  "people",
  "publications",
  "url",
  "status",
  "availability",
  "license",
  "repository",
  "documentation",
  "citation",
  "version",
  "audience",
  "deadline",
  "applicationUrl",
]);
const arrayRecordKeys = new Set([
  "interests",
  "research",
  "authors",
  "editors",
  "keywords",
  "people",
  "publications",
]);

const fail = (message) => {
  throw new Error(`Public bundle: ${message}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const portable = (path) => path.split(sep).join("/");

async function fileTree(directory) {
  const root = resolve(directory);
  if ((await lstat(root)).isSymbolicLink())
    fail("input/output directory must not be a symlink");
  const files = new Map();
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      const name = portable(relative(root, full));
      if (entry.isSymbolicLink()) fail(`symlink is forbidden: ${name}`);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) {
        const stat = await lstat(full);
        if (stat.nlink > 1) fail(`hard link is forbidden: ${name}`);
        files.set(name, full);
      } else fail(`non-regular file is forbidden: ${name}`);
    }
  }
  await visit(root);
  return files;
}

function allowedInput(name, { entrypoints, publicAssets, excludedFiles = [] }) {
  return (
    entrypoints.includes(name) ||
    publicAssets.includes(name) ||
    excludedFiles.includes(name) ||
    omittedExports.has(name) ||
    astroAsset.test(name) ||
    pagefindRuntime.has(name) ||
    unusedPagefind.has(name) ||
    pagefindData.test(name)
  );
}

function inspectJson(value, file) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      forbiddenKeys.has(key) ||
      /(?:secret|password|credential|private|internal|provenance|sourcePath|cffSha)/i.test(
        key,
      )
    )
      fail(`internal field “${key}” in ${file}`);
    inspectJson(child, file);
  }
}

function inspectText(text, file) {
  const patterns = [
    [
      "local filesystem path",
      /(?:\/Users\/|\/home\/runner\/work\/|\/private\/var\/|file:\/\/)/,
    ],
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    [
      "GitHub credential",
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
    ],
    ["cloud access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ["source map", /sourceMappingURL\s*=/],
    [
      "internal documentation reference",
      /\bdocs\/(?:GITHUB_REVIEW|CONTENT_BACKLOG|LAUNCH_CHECKLIST)\.md\b/,
    ],
  ];
  for (const [label, pattern] of patterns)
    if (pattern.test(text)) fail(`${label} in ${file}`);
}

function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) walk(child, callback);
  if (node.content) walk(node.content, callback);
}

function stringValues(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(stringValues);
  return [];
}

// Pagefind's generated metadata is a compact CBOR array. Decode only its public
// scalar/array/map values; an unfamiliar format must be reviewed, not copied.
function pagefindMetadata(bytes, name) {
  const decoded = gunzipSync(bytes, { maxOutputLength: 1024 * 1024 });
  const magic = Buffer.from("pagefind_dcd");
  if (!decoded.subarray(0, magic.length).equals(magic))
    fail(`invalid search metadata: ${name}`);
  const data = decoded.subarray(magic.length);
  let offset = 0;
  const integer = (additional) => {
    if (additional < 24) return additional;
    const size = { 24: 1, 25: 2, 26: 4 }[additional];
    if (!size || offset + size > data.length)
      fail(`unsupported search metadata: ${name}`);
    const value = data.readUIntBE(offset, size);
    offset += size;
    return value;
  };
  const read = (depth = 0) => {
    if (depth > 32 || offset >= data.length)
      fail(`invalid search metadata: ${name}`);
    const header = data[offset++];
    const type = header >> 5;
    const size = integer(header & 31);
    if (type === 0) return size;
    if (type === 1) return -1 - size;
    if (type === 3) {
      if (offset + size > data.length)
        fail(`truncated search metadata: ${name}`);
      const value = data.toString("utf8", offset, offset + size);
      offset += size;
      return value;
    }
    if (type === 4 || type === 5) {
      if (size > 100000) fail(`oversized search metadata: ${name}`);
      const values = Array.from({ length: size * (type === 5 ? 2 : 1) }, () =>
        read(depth + 1),
      );
      return values;
    }
    if (type === 7 && [20, 21, 22].includes(size)) return null;
    fail(`unsupported search metadata: ${name}`);
  };
  const result = read();
  if (offset !== data.length || !Array.isArray(result))
    fail(`invalid search metadata: ${name}`);
  return result;
}

function references(text, name) {
  const refs = [];
  if (name.endsWith(".html")) {
    walk(parse(text), (node) => {
      const attrs = Object.fromEntries(
        (node.attrs ?? []).map(({ name, value }) => [name, value]),
      );
      for (const key of ["href", "src", "poster", "action", "data"])
        if (attrs[key]) refs.push(attrs[key]);
      if (attrs.srcset && !attrs.srcset.startsWith("data:")) {
        refs.push(
          ...attrs.srcset.split(",").map((item) => item.trim().split(/\s+/)[0]),
        );
      }
      if (
        node.tagName === "script" &&
        /^(?:application\/ld\+json|application\/json)$/.test(attrs.type ?? "")
      ) {
        const data = JSON.parse(
          (node.childNodes ?? []).map((child) => child.value ?? "").join(""),
        );
        inspectJson(data, name);
        refs.push(
          ...stringValues(data).filter((value) => /^https?:|^\//.test(value)),
        );
      }
      if (attrs.style) refs.push(...cssReferences(attrs.style));
      if (node.tagName === "style")
        refs.push(
          ...cssReferences(
            (node.childNodes ?? []).map((child) => child.value ?? "").join(""),
          ),
        );
    });
  } else if (name.endsWith(".css")) refs.push(...cssReferences(text));
  else if (name.endsWith(".js") && !name.startsWith("pagefind/")) {
    // Vite emits relative imports and asset URL literals. Dynamic Pagefind files
    // are handled from its generated manifest below rather than guessed here.
    refs.push(
      ...[
        ...text.matchAll(
          /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*|\bnew URL\s*\(\s*)["']([^"']+)["']/g,
        ),
      ].map((match) => match[1]),
    );
    refs.push(
      ...[
        ...text.matchAll(
          /["']((?:\/|\.\/|\.\.\/)[^"'\s]+\.(?:js|css|png|jpe?g|webp|avif|svg|woff2?))["']/g,
        ),
      ].map((match) => match[1]),
    );
  } else if (name.endsWith(".xml"))
    refs.push(
      ...[...text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
        match[1].replaceAll("&amp;", "&"),
      ),
    );
  else if (name === "llms.txt")
    refs.push(
      ...[...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]),
    );
  else if (name === "site.webmanifest")
    refs.push(...JSON.parse(text).icons.map((icon) => icon.src));
  else if (name === "site-index.json")
    refs.push(
      ...stringValues(JSON.parse(text)).filter((value) =>
        /^https?:|^\//.test(value),
      ),
    );
  return refs;
}

function cssReferences(text) {
  return [...text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)].map(
    (match) => match[1],
  );
}

function pageUrl(name, origin, base) {
  const path = name === "index.html" ? "" : name.replace(/\/index\.html$/, "/");
  return `${origin}${base}/${path}`;
}

function inspectDestination(
  text,
  name,
  origin,
  base,
  indexingEnabled,
  publicPages,
  policy,
) {
  const home = `${origin}${base}/`;
  const requireSiteUrl = (raw) => {
    if (typeof raw !== "string" || !raw.startsWith(home))
      fail(`public discovery URL uses another destination in ${name}`);
  };
  if (name.endsWith(".html")) {
    const canonical = [];
    const social = [];
    const robots = [];
    walk(parse(text), (node) => {
      if (node.nodeName === "#comment")
        fail(`unexpected HTML comment in ${name}`);
      const attrs = Object.fromEntries(
        (node.attrs ?? []).map(({ name, value }) => [name, value]),
      );
      if (node.tagName === "link" && attrs.rel === "canonical")
        canonical.push(attrs.href);
      if (node.tagName === "meta" && attrs.property === "og:url")
        social.push(attrs.content);
      if (node.tagName === "meta" && attrs.name === "robots")
        robots.push(attrs.content);
      if (node.tagName === "script" && attrs.type === "application/ld+json") {
        const data = JSON.parse(
          (node.childNodes ?? []).map((child) => child.value ?? "").join(""),
        );
        inspectJson(data, name);
        const entities = data["@graph"] ?? [data];
        for (const entity of entities) {
          if (
            /^(?:ResearchOrganization|WebSite|\w*Page|ItemList)$/.test(
              entity["@type"] ?? "",
            )
          ) {
            requireSiteUrl(entity["@id"]);
            if (entity.url) requireSiteUrl(entity.url);
          }
        }
      }
    });
    const expected = pageUrl(name, origin, base);
    if (canonical.length !== 1 || canonical[0] !== expected)
      fail(`canonical URL differs from deployment destination in ${name}`);
    if (social.length !== 1 || social[0] !== expected)
      fail(`social URL differs from deployment destination in ${name}`);
    const shouldIndex =
      indexingEnabled &&
      publicPages
        .filter((page) => !["search/index.html", "404.html"].includes(page))
        .includes(name);
    const directives = (robots[0] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase());
    if (
      robots.length !== 1 ||
      !directives.includes(shouldIndex ? "index" : "noindex") ||
      directives.includes(shouldIndex ? "noindex" : "index")
    )
      fail(`page indexing differs from deployment configuration in ${name}`);
  } else if (name === "site-index.json") {
    const index = JSON.parse(text);
    if (index.canonical !== home)
      fail("site-index canonical differs from deployment destination");
    if (!policy.validateIndex)
      for (const record of index.records) requireSiteUrl(record.id);
  } else if (name.startsWith("sitemap") && name.endsWith(".xml")) {
    const locations = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => match[1],
    );
    const expected =
      name === "sitemap-index.xml" ?
        [`${home}sitemap-0.xml`]
      : publicPages
          .filter((page) => !["search/index.html", "404.html"].includes(page))
          .map((page) => pageUrl(page, origin, base));
    if (
      locations.length !== expected.length ||
      expected.some((url) => !locations.includes(url))
    )
      fail(`sitemap destinations differ from public routes in ${name}`);
  } else if (name === "robots.txt") {
    const sitemaps = [...text.matchAll(/^Sitemap:\s*(\S+)\s*$/gm)].map(
      (match) => match[1],
    );
    const groups = text.split(/\n\s*\n/);
    const wildcard =
      groups.find((group) => /^User-agent:\s*\*\s*$/im.test(group)) ?? "";
    if (indexingEnabled) {
      if (sitemaps.length !== 1 || sitemaps[0] !== `${home}sitemap-index.xml`)
        fail("robots sitemap differs from deployment destination");
      if (
        !/^Allow:\s*\/\s*$/im.test(wildcard) ||
        /^Disallow:\s*\/\s*$/im.test(wildcard)
      )
        fail("robots indexing differs from deployment configuration");
    } else if (
      sitemaps.length ||
      /^Allow:/im.test(text) ||
      !/^Disallow:\s*\/\s*$/im.test(wildcard) ||
      groups
        .filter((group) => /^User-agent:/im.test(group))
        .some((group) => !/^Disallow:\s*\/\s*$/im.test(group))
    ) {
      fail("review build must disallow indexing without advertising a sitemap");
    }
  } else if (
    name === "llms.txt" &&
    !text.includes(`Canonical site: ${home}\n`)
  ) {
    fail(
      "language-model discovery canonical differs from deployment destination",
    );
  }
}

function localTarget(raw, from, files, origin, base) {
  if (!raw || /^(?:#|mailto:|tel:|data:|blob:)/i.test(raw)) return undefined;
  if (/^javascript:/i.test(raw)) fail(`unsafe URL in ${from}`);
  const fromPath =
    from.endsWith("/index.html") ? from.slice(0, -10)
    : from === "index.html" ? ""
    : from;
  const url = new URL(raw, `${origin}${base}/${fromPath}`);
  if (url.origin !== origin) return undefined;
  const pathname = decodeURIComponent(url.pathname);
  if (base && pathname !== base && !pathname.startsWith(base + "/")) {
    // Other projects can share a github.io hostname; their absolute links are
    // external destinations, not part of this site's artifact. Relative and
    // root-relative escapes remain errors.
    if (/^https?:\/\//i.test(raw)) return undefined;
    fail(`URL escapes deployment base in ${from}`);
  }
  const path = pathname.slice(base.length).replace(/^\//, "");
  if (
    path.split("/").includes("..") ||
    path.includes("\\") ||
    path.includes("\0")
  )
    fail(`unsafe path in ${from}`);
  for (const candidate of [
    path,
    path + (!path || path.endsWith("/") ? "" : "/") + "index.html",
    path + ".html",
  ]) {
    if (files.has(candidate)) return candidate;
  }
  fail(`missing local dependency from ${from}: ${path}`);
}

function validateIndex(text) {
  const index = JSON.parse(text);
  const keys = new Set([
    "schemaVersion",
    "canonical",
    "name",
    "description",
    "affiliation",
    "records",
  ]);
  for (const key of Object.keys(index))
    if (!keys.has(key)) fail(`unexpected site-index field: ${key}`);
  if (
    index.schemaVersion !== 1 ||
    !Array.isArray(index.records) ||
    !index.records.length
  )
    fail("invalid site-index schema");
  for (const key of ["canonical", "name", "description"]) {
    if (typeof index[key] !== "string") fail(`invalid site-index ${key}`);
  }
  if (
    !index.affiliation ||
    typeof index.affiliation !== "object" ||
    Array.isArray(index.affiliation)
  )
    fail("invalid public affiliation");
  for (const [key, value] of Object.entries(index.affiliation)) {
    if (!["name", "parent"].includes(key) || typeof value !== "string")
      fail("invalid public affiliation field");
  }
  const ids = new Set();
  for (const record of index.records) {
    if (!record || typeof record !== "object" || Array.isArray(record))
      fail("invalid public record");
    for (const [key, value] of Object.entries(record)) {
      if (!recordKeys.has(key)) fail(`unexpected public record field: ${key}`);
      if (arrayRecordKeys.has(key)) {
        if (
          !Array.isArray(value) ||
          value.some((item) => typeof item !== "string")
        )
          fail(`invalid public array field: ${key}`);
      } else if (typeof value !== "string")
        fail(`invalid public text field: ${key}`);
    }
    if (typeof record.id !== "string" || typeof record.type !== "string")
      fail("public record requires id and type");
    if (ids.has(record.id)) fail("duplicate public record id");
    ids.add(record.id);
  }
  inspectJson(index, "site-index.json");
}

/** Build a dependency-closed selection without copying the repository or raw dist. */
export async function planPublicBundle({
  inputDirectory,
  siteUrl,
  basePath = "",
  indexingEnabled = true,
  policy,
}) {
  const { publicPages, entrypoints } = policy;
  if (typeof indexingEnabled !== "boolean")
    fail("invalid indexing configuration");
  const destination = new URL(siteUrl);
  if (
    !["https:", "http:"].includes(destination.protocol) ||
    destination.username ||
    destination.password
  )
    fail("invalid deployment origin");
  const origin = destination.origin;
  const base = basePath ? "/" + basePath.replace(/^\/+|\/+$/g, "") : "";
  if (
    base.split("/").some((segment) => [".", ".."].includes(segment)) ||
    /[?#\\\s]/.test(base)
  )
    fail("invalid deployment base");
  if (!policy || !Array.isArray(entrypoints) || !Array.isArray(publicPages))
    fail("missing bundle policy");
  for (const name of [...entrypoints, ...publicPages, ...policy.publicAssets]) {
    if (
      !/^[A-Za-z0-9_./-]+$/.test(name) ||
      name.split("/").some((part) => !part || part === "." || part === "..")
    )
      fail("unsafe policy path");
  }
  const files = await fileTree(inputDirectory);
  for (const name of files.keys())
    if (!allowedInput(name, policy)) fail(`unexpected build file: ${name}`);
  for (const name of entrypoints)
    if (!files.has(name)) fail(`required public file missing: ${name}`);
  const selected = new Set();
  const queue = [...entrypoints];
  // Pagefind loads language-specific chunks dynamically, so include its generated
  // search corpus and selected runtime, not the unused alternate UI distributions.
  if (policy.search !== false) {
    for (const name of pagefindRuntime) {
      if (!files.has(name)) fail(`required search runtime missing: ${name}`);
      queue.push(name);
    }
    const entry = JSON.parse(
      await readFile(files.get("pagefind/pagefind-entry.json"), "utf8"),
    );
    if (!entry.languages || !Object.keys(entry.languages).length)
      fail("missing search languages");
    for (const language of Object.values(entry.languages)) {
      const metadataName = `pagefind/pagefind.${language.hash}.pf_meta`;
      for (const name of [
        metadataName,
        `pagefind/wasm.${language.wasm}.pagefind`,
      ]) {
        if (!files.has(name))
          fail(`search manifest dependency missing: ${name}`);
        queue.push(name);
      }
      const metadata = pagefindMetadata(
        await readFile(files.get(metadataName)),
        metadataName,
      );
      if (metadata[0] !== entry.version)
        fail("search metadata version differs from runtime");
      for (const id of new Set(stringValues(metadata))) {
        if (!/^[a-z][\w-]*_[a-f\d]+$/i.test(id)) continue;
        const dependencies = ["index", "fragment", "filter"]
          .map((kind) => `pagefind/${kind}/${id}.pf_${kind}`)
          .filter((name) => files.has(name));
        if (!dependencies.length) fail(`search metadata chunk missing: ${id}`);
        queue.push(...dependencies);
      }
    }
  }
  while (queue.length) {
    const name = queue.shift();
    if (selected.has(name)) continue;
    if ((policy.excludedFiles ?? []).includes(name))
      fail(`page references excluded file: ${name}`);
    if (omittedExports.has(name) || unusedPagefind.has(name))
      fail(`page references a retired export: ${name}`);
    selected.add(name);
    if (files.has(`${name}.license`)) queue.push(`${name}.license`);
    const bytes = await readFile(files.get(name));
    if (textExtension.test(name)) {
      const text = bytes.toString("utf8");
      inspectText(text, name);
      inspectDestination(
        text,
        name,
        origin,
        base,
        indexingEnabled,
        publicPages,
        policy,
      );
      if (name === "site-index.json")
        (policy.validateIndex ?? validateIndex)(text, {
          origin,
          base,
          publicPages,
        });
      if (name.endsWith(".json") || name.endsWith(".webmanifest"))
        inspectJson(JSON.parse(text), name);
      for (const ref of references(text, name)) {
        const target = localTarget(ref, name, files, origin, base);
        if (target) queue.push(target);
      }
    }
    if (name.endsWith(".pf_fragment")) {
      const text = gunzipSync(bytes).toString("utf8");
      if (!text.startsWith("pagefind_dcd"))
        fail(`invalid search fragment: ${name}`);
      inspectText(text, name);
      const fragment = JSON.parse(text.slice("pagefind_dcd".length));
      inspectJson(fragment, name);
      // Pagefind stores site-relative paths; its component's base-url prepends
      // the project path when presenting results on GitHub Pages.
      if (
        typeof fragment.url !== "string" ||
        !fragment.url.startsWith("/") ||
        fragment.url.startsWith("//")
      )
        fail(`invalid search fragment URL: ${name}`);
      const fragmentUrl =
        base && !fragment.url.startsWith(base + "/") ?
          base + fragment.url
        : fragment.url;
      const target = localTarget(
        fragmentUrl,
        "index.html",
        files,
        origin,
        base,
      );
      if (
        !publicPages
          .filter((page) => !["search/index.html", "404.html"].includes(page))
          .includes(target)
      )
        fail(`search fragment includes non-public content: ${name}`);
      queue.push(target);
    }
  }
  return {
    files,
    selected: [...selected].sort(),
    excluded: [...files.keys()].filter((name) => !selected.has(name)).sort(),
    origin,
    base,
    indexingEnabled,
  };
}

export async function buildPublicBundle(options) {
  const input = resolve(options.inputDirectory);
  const output = resolve(options.outputDirectory);
  const manifestFile = resolve(options.manifestFile);
  if (options.sourceCommit && !/^[a-f\d]{40,64}$/.test(options.sourceCommit))
    fail("invalid source commit");
  if (
    basename(output) !== "_site" ||
    dirname(output) !== dirname(input) ||
    output === input ||
    input.startsWith(output + sep)
  )
    fail("output must be a separate _site directory");
  if (manifestFile === output || manifestFile.startsWith(output + sep))
    fail("release manifest must stay outside the public bundle");
  const plan = await planPublicBundle(options);
  try {
    if ((await realpath(output)) !== output)
      fail("output must not resolve through a symlink");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // _site is an exclusively generated staging directory, never source or history.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const records = [];
  for (const name of plan.selected) {
    const target = join(output, name);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(plan.files.get(name), target);
    const bytes = await readFile(target);
    records.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
  }
  const manifest = {
    schemaVersion: 1,
    origin: plan.origin,
    base: plan.base,
    siteUrl: new URL(plan.base + "/", plan.origin).toString(),
    indexingEnabled: plan.indexingEnabled,
    sourceCommit: options.sourceCommit,
    files: records,
    totalBytes: records.reduce((total, item) => total + item.bytes, 0),
    excluded: plan.excluded,
  };
  await mkdir(dirname(manifestFile), { recursive: true });
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  await auditPublicBundle({
    directory: output,
    manifestFile,
    siteUrl: options.siteUrl,
    basePath: options.basePath,
    sourceCommit: options.sourceCommit,
    indexingEnabled: options.indexingEnabled,
    policy: options.policy,
  });
  return manifest;
}

/** Verify the exact tested artifact before upload; an extra byte or file is a failure. */
export async function auditPublicBundle({
  directory,
  manifestFile,
  siteUrl,
  basePath = "",
  sourceCommit,
  indexingEnabled = true,
  policy,
}) {
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files))
    fail("invalid release manifest");
  if (sourceCommit && manifest.sourceCommit !== sourceCommit)
    fail("source commit differs from release manifest");
  const files = await fileTree(directory);
  const expected = new Set(manifest.files.map((item) => item.path));
  if (expected.size !== manifest.files.length || files.size !== expected.size)
    fail("artifact file inventory differs from release manifest");
  for (const item of manifest.files) {
    if (!files.has(item.path)) fail(`missing artifact file: ${item.path}`);
    const bytes = await readFile(files.get(item.path));
    if (bytes.length !== item.bytes || hash(bytes) !== item.sha256)
      fail(`artifact changed after packaging: ${item.path}`);
  }
  const plan = await planPublicBundle({
    inputDirectory: directory,
    policy,
    siteUrl,
    basePath,
    indexingEnabled,
  });
  if (plan.excluded.length)
    fail("artifact contains files outside its dependency closure");
  if (manifest.origin !== plan.origin || manifest.base !== plan.base)
    fail("deployment destination differs from manifest");
  if (manifest.indexingEnabled !== plan.indexingEnabled)
    fail("indexing configuration differs from manifest");
  if (manifest.siteUrl !== new URL(plan.base + "/", plan.origin).toString())
    fail("canonical site URL differs from manifest");
  return manifest;
}
