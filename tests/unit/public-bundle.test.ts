// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import {
  auditPublicBundle,
  buildPublicBundle,
} from "../../scripts/lib/public-bundle.mjs";

const temporary: string[] = [];
const origin = "https://example.test";
const base = "/project";
const publicPages = [
  "index.html",
  "about/index.html",
  "news/index.html",
  "news/example/index.html",
  "people/index.html",
  "research/index.html",
  "search/index.html",
  "404.html",
];
const policy = {
  publicPages,
  entrypoints: [
    ...publicPages,
    "THIRD_PARTY_NOTICES.txt",
    "licenses/OFL-1.1.txt",
    "publications.bib",
    "publications.csl.json",
    "robots.txt",
    "llms.txt",
    "sitemap-index.xml",
    "sitemap-0.xml",
    "site-index.json",
    "site.webmanifest",
  ],
  publicAssets: ["favicon.ico"],
};
const htmlPage = (
  body: string,
  page = "index.html",
  indexingEnabled = true,
) => {
  const path = page === "index.html" ? "" : page.replace(/\/index\.html$/, "/");
  const canonical = `${origin}${base}/${path}`;
  const robots =
    indexingEnabled && publicPages.slice(0, 6).includes(page) ?
      "index, follow"
    : "noindex, follow";
  return `<html><head><link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"><meta name="robots" content="${robots}"></head><body>${body}</body></html>`;
};
const cbor = (value: string | number | unknown[]): Buffer => {
  if (Array.isArray(value))
    return Buffer.concat([
      Buffer.from([0x80 + value.length]),
      ...value.map((item) => cbor(item as string)),
    ]);
  if (typeof value === "number") return Buffer.from([value]);
  return Buffer.concat([
    Buffer.from([0x60 + Buffer.byteLength(value)]),
    Buffer.from(value),
  ]);
};
afterEach(async () => {
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});

const fixture = async (indexingEnabled = true) => {
  const root = await mkdtemp(join(tmpdir(), "public-bundle-test-"));
  temporary.push(root);
  const inputDirectory = join(root, "dist");
  const outputDirectory = join(root, "_site");
  const manifestFile = join(root, "release-manifest.json");
  const put = async (name: string, content: string | Buffer) => {
    const file = join(inputDirectory, name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  const body = `<link rel="stylesheet" href="${base}/_astro/style.hash.css"><img src="${base}/_astro/photo.hash.webp" srcset="${base}/_astro/photo.hash.webp 1x, ${base}/_astro/photo-large.hash.webp 2x"><picture><source media="(prefers-color-scheme:dark)" srcset="${base}/_astro/photo-dark.hash.webp"></picture><script type="module" src="${base}/_astro/app.hash.js"></script>`;
  for (const page of publicPages)
    await put(page, htmlPage(body, page, indexingEnabled));
  for (const name of [
    "THIRD_PARTY_NOTICES.txt",
    "licenses/OFL-1.1.txt",
    "publications.bib",
  ])
    await put(name, "Public content");
  await put(
    "robots.txt",
    indexingEnabled ?
      `User-agent: *\nAllow: /\nSitemap: ${origin}${base}/sitemap-index.xml\n`
    : "User-agent: *\nDisallow: /\n",
  );
  await put("llms.txt", `Canonical site: ${origin}${base}/\n`);
  await put("publications.csl.json", "[]");
  await put(
    "sitemap-index.xml",
    `<sitemapindex><sitemap><loc>${origin}${base}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
  );
  await put(
    "sitemap-0.xml",
    `<urlset>${publicPages
      .slice(0, 6)
      .map((page) => {
        const path =
          page === "index.html" ? "" : page.replace(/\/index\.html$/, "/");
        return `<url><loc>${origin}${base}/${path}</loc></url>`;
      })
      .join("")}</urlset>`,
  );
  await put(
    "site-index.json",
    JSON.stringify({
      schemaVersion: 1,
      canonical: origin + base + "/",
      name: "Example",
      description: "Public lab",
      affiliation: { name: "Department" },
      records: [{ id: origin + base + "/", type: "WebPage", title: "Home" }],
    }),
  );
  await put(
    "site.webmanifest",
    JSON.stringify({ icons: [{ src: "favicon.ico" }] }),
  );
  await put("favicon.ico", Buffer.from([1, 2, 3]));
  await put("_astro/style.hash.css", "@font-face{src:url(./font.hash.woff2)}");
  await put("_astro/font.hash.woff2", Buffer.from([4, 5, 6]));
  for (const name of [
    "photo.hash.webp",
    "photo-large.hash.webp",
    "photo-dark.hash.webp",
    "unused-original.hash.png",
  ])
    await put("_astro/" + name, Buffer.from([7, 8, 9]));
  await put("_astro/app.hash.js", 'import "./helper.hash.js";');
  await put("_astro/helper.hash.js", "export const ready = true;");
  for (const name of [
    "pagefind.js",
    "pagefind-worker.js",
    "pagefind-component-ui.js",
    "pagefind-component-ui.css",
  ])
    await put("pagefind/" + name, "/* Search runtime */");
  await put(
    "pagefind/pagefind-entry.json",
    JSON.stringify({
      version: "1.5.2",
      languages: {
        "en-us": { hash: "en-us_123", wasm: "en-us", page_count: 1 },
      },
    }),
  );
  for (const name of [
    "wasm.en-us.pagefind",
    "wasm.unknown.pagefind",
    "index/en-us_123.pf_index",
  ])
    await put("pagefind/" + name, Buffer.from([10, 11, 12]));
  await put(
    "pagefind/pagefind.en-us_123.pf_meta",
    gzipSync(
      Buffer.concat([
        Buffer.from("pagefind_dcd"),
        cbor([
          "1.5.2",
          [["en-us_123", 1]],
          [["a", "z", "en-us_123"]],
          [],
          [],
          ["title"],
        ]),
      ]),
    ),
  );
  await put(
    "pagefind/fragment/en-us_123.pf_fragment",
    gzipSync(
      "pagefind_dcd" +
        JSON.stringify({
          url: "/",
          content: "Public lab research",
          meta: { title: "Home" },
        }),
    ),
  );
  await put("pagefind/pagefind-ui.js", "/* Unused alternate UI */");
  return {
    put,
    options: {
      policy,
      inputDirectory,
      outputDirectory,
      manifestFile,
      siteUrl: origin,
      basePath: base,
      indexingEnabled,
    },
  };
};

describe("public deployment bundle", () => {
  it("supports an explicitly non-indexable review build and records that contract", async () => {
    const { options } = await fixture(false);
    const manifest = await buildPublicBundle(options);
    expect(manifest.indexingEnabled).toBe(false);
    expect(
      await auditPublicBundle({
        ...options,
        directory: options.outputDirectory,
        sourceCommit: undefined,
      }),
    ).toEqual(manifest);
  });

  it("rejects indexable HTML in a non-indexable review build", async () => {
    const { put, options } = await fixture(false);
    await put("index.html", htmlPage("Review content"));
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "page indexing differs",
    );
  });

  it("rejects an advertised sitemap or crawler allow rule in a review build", async () => {
    const { put, options } = await fixture(false);
    await put(
      "robots.txt",
      `User-agent: *\nAllow: /\nSitemap: ${origin}${base}/sitemap-index.xml\n`,
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "review build must disallow",
    );
  });

  it("rejects a noindex review build when indexable publication was requested", async () => {
    const { options } = await fixture(false);
    await expect(
      buildPublicBundle({ ...options, indexingEnabled: true }),
    ).rejects.toThrow("page indexing differs");
  });

  it("keeps responsive images, fonts, module imports, legal text, and dynamic search, excluding unused exports and images", async () => {
    const { options } = await fixture();
    const manifest = await buildPublicBundle(options);
    const paths = manifest.files.map((file: { path: string }) => file.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        ...publicPages,
        "_astro/photo-dark.hash.webp",
        "_astro/photo-large.hash.webp",
        "_astro/font.hash.woff2",
        "_astro/helper.hash.js",
        "THIRD_PARTY_NOTICES.txt",
        "pagefind/fragment/en-us_123.pf_fragment",
        "pagefind/wasm.en-us.pagefind",
      ]),
    );
    expect(manifest.excluded).toEqual(
      expect.arrayContaining([
        "_astro/unused-original.hash.png",
        "pagefind/pagefind-ui.js",
        "pagefind/wasm.unknown.pagefind",
      ]),
    );
    expect(paths).not.toContain("release-manifest.json");
    expect(
      await auditPublicBundle({
        ...options,
        directory: options.outputDirectory,
        sourceCommit: undefined,
      }),
    ).toEqual(manifest);
  });

  it.each([
    "secret.env",
    ".git/config",
    "_astro/source.js.map",
    "private/draft.pdf",
    "people/old-profile/index.html",
    "unexpected.json",
  ])("rejects unexpected or obsolete build file %s", async (name) => {
    const { put, options } = await fixture();
    await put(name, "must not publish");
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "unexpected build file",
    );
  });

  it("rejects symlinks instead of following them into the repository", async () => {
    const { options } = await fixture();
    await symlink(
      options.manifestFile,
      join(options.inputDirectory, "exfiltrate"),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow("symlink");
  });

  it("rejects references escaping the project base", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage('<a href="../private/report.pdf">Report</a>'),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "escapes deployment base",
    );
  });

  it("allows absolute links to other projects sharing the GitHub Pages hostname", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage(
        `<a href="${origin}/other-project/documentation/">other-project documentation</a>`,
      ),
    );
    const manifest = await buildPublicBundle(options);
    expect(
      manifest.files.every(
        (file: { path: string }) => !file.path.startsWith("other-project/"),
      ),
    ).toBe(true);
  });

  it("fails when a referenced dependency is missing instead of silently dropping it", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage(`<img src="${base}/_astro/missing.webp">`),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "missing local dependency",
    );
  });

  it.each([
    "/Users/private-person/Applications/private.pdf",
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "ghp_" + "a".repeat(36),
    "//# sourceMappingURL=source.js.map",
    "See docs/GITHUB_REVIEW.md",
  ])(
    "rejects sensitive markers without returning their contents",
    async (marker) => {
      const { put, options } = await fixture();
      await put("index.html", `<main>${marker}</main>`);
      await expect(buildPublicBundle(options)).rejects.toThrow(/in index.html/);
    },
  );

  it("rejects editorial fields in public index records", async () => {
    const { put, options } = await fixture();
    const value = JSON.parse(
      await readFile(join(options.inputDirectory, "site-index.json"), "utf8"),
    ) as { records: Array<Record<string, unknown>> };
    value.records[0].programArc = "internal";
    await put("site-index.json", JSON.stringify(value));
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "unexpected public record field",
    );
  });

  it("inspects embedded JSON rather than checking only standalone exports", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage(
        '<script type="application/ld+json">{"@type":"WebPage","nested":{"draft":true}}</script>',
      ),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow("internal field");
  });

  it("rejects unstructured objects hidden inside an otherwise public index field", async () => {
    const { put, options } = await fixture();
    const index = JSON.parse(
      await readFile(join(options.inputDirectory, "site-index.json"), "utf8"),
    ) as { records: Array<Record<string, unknown>> };
    index.records[0].description = { editorialNotes: "not public" };
    await put("site-index.json", JSON.stringify(index));
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "invalid public text field",
    );
  });

  it("inspects compressed search content and excludes hidden pages", async () => {
    const { put, options } = await fixture();
    await put(
      "pagefind/fragment/en-us_123.pf_fragment",
      gzipSync(
        "pagefind_dcd" +
          JSON.stringify({ url: base + "/search/", content: "Hidden utility" }),
      ),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "non-public content",
    );
  });

  it("fails if the tested bundle changes or gains files before deployment", async () => {
    const { options } = await fixture();
    await buildPublicBundle(options);
    await writeFile(join(options.outputDirectory, "index.html"), "tampered");
    await expect(
      auditPublicBundle({
        ...options,
        directory: options.outputDirectory,
        sourceCommit: undefined,
      }),
    ).rejects.toThrow("changed after packaging");
    await writeFile(join(options.outputDirectory, "extra.json"), "{}");
    await expect(
      auditPublicBundle({
        ...options,
        directory: options.outputDirectory,
        sourceCommit: undefined,
      }),
    ).rejects.toThrow("file inventory");
  });

  it("refuses source-directory cleanup or a manifest inside the public artifact", async () => {
    const { options } = await fixture();
    await expect(
      buildPublicBundle({
        ...options,
        outputDirectory: options.inputDirectory,
      }),
    ).rejects.toThrow("separate _site");
    await expect(
      buildPublicBundle({
        ...options,
        manifestFile: join(options.outputDirectory, "manifest.json"),
      }),
    ).rejects.toThrow("outside the public bundle");
  });

  it.each([
    "index.html",
    "site-index.json",
    "robots.txt",
    "llms.txt",
    "sitemap-index.xml",
    "sitemap-0.xml",
  ])("rejects wrong-host discovery metadata in %s", async (name) => {
    const { put, options } = await fixture();
    const original = await readFile(join(options.inputDirectory, name), "utf8");
    await put(
      name,
      original.replaceAll(origin, "https://unapproved.example.test"),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      /destination|canonical/,
    );
  });

  it("rejects stale structured-data identity even when the page canonical is correct", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage(
        '<script type="application/ld+json">{"@type":"ResearchOrganization","@id":"https://wrong.test/#organization","url":"https://wrong.test/"}</script>',
      ),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow(
      "another destination",
    );
  });

  it("rejects hidden HTML comments rather than publishing implementation notes", async () => {
    const { put, options } = await fixture();
    await put(
      "index.html",
      htmlPage("<!-- Internal editorial instructions -->"),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow("HTML comment");
  });

  it("binds the release manifest to the tested source commit", async () => {
    const { options } = await fixture();
    const sourceCommit = "a".repeat(40);
    const manifest = await buildPublicBundle({ ...options, sourceCommit });
    expect(manifest.sourceCommit).toBe(sourceCommit);
    await expect(
      auditPublicBundle({
        ...options,
        directory: options.outputDirectory,
        sourceCommit: "b".repeat(40),
      }),
    ).rejects.toThrow("source commit differs");
  });

  it("omits orphan search chunks not referenced by active Pagefind metadata", async () => {
    const { put, options } = await fixture();
    await put("pagefind/index/en-us_deadbeef.pf_index", Buffer.from([0, 1]));
    await put(
      "pagefind/fragment/en-us_deadbeef.pf_fragment",
      gzipSync(
        "pagefind_dcd" +
          JSON.stringify({
            url: base + "/",
            content: "Stale but same public URL",
          }),
      ),
    );
    const manifest = await buildPublicBundle(options);
    expect(manifest.excluded).toEqual(
      expect.arrayContaining([
        "pagefind/index/en-us_deadbeef.pf_index",
        "pagefind/fragment/en-us_deadbeef.pf_fragment",
      ]),
    );
  });

  it("rejects an unknown search metadata format rather than including unverified chunks", async () => {
    const { put, options } = await fixture();
    await put(
      "pagefind/pagefind.en-us_123.pf_meta",
      gzipSync("pagefind_dcd" + "not CBOR"),
    );
    await expect(buildPublicBundle(options)).rejects.toThrow("search metadata");
  });
});

describe("site-specific packaging policy", () => {
  it("packages a site without search and keeps referenced asset licenses", async () => {
    const { options, put } = await fixture();
    await rm(join(options.inputDirectory, "pagefind"), { recursive: true });
    await put("favicon.ico.license", "License: MIT");
    const manifest = await buildPublicBundle({
      ...options,
      policy: {
        ...policy,
        search: false,
        publicAssets: [...policy.publicAssets, "favicon.ico.license"],
      },
    });
    expect(
      manifest.files.some(({ path }) => path === "favicon.ico.license"),
    ).toBe(true);
    expect(
      manifest.files.some(({ path }: { path: string }) =>
        path.startsWith("pagefind/"),
      ),
    ).toBe(false);
  });
  it("never publishes explicitly excluded files even when linked", async () => {
    const { options, put } = await fixture();
    await put("notes.txt", "Editorial notes");
    const custom = {
      ...options,
      policy: { ...policy, excludedFiles: ["notes.txt"] },
    };
    expect((await buildPublicBundle(custom)).excluded).toContain("notes.txt");
    await put("index.html", htmlPage('<a href="notes.txt">Notes</a>'));
    await expect(buildPublicBundle(custom)).rejects.toThrow("excluded file");
  });
  it("applies an explicit discovery validator during packaging and re-audit", async () => {
    const { options, put } = await fixture();
    await put(
      "site-index.json",
      JSON.stringify({
        canonical: `${origin}${base}/`,
        records: [
          {
            id: "https://software.example/project",
            type: "SoftwareSourceCode",
          },
        ],
      }),
    );
    let calls = 0;
    const custom = {
      ...options,
      policy: {
        ...policy,
        validateIndex: (text: string) => {
          calls++;
          expect(
            (JSON.parse(text) as { records: Array<{ type: string }> })
              .records[0].type,
          ).toBe("SoftwareSourceCode");
        },
      },
    };
    await buildPublicBundle(custom);
    await auditPublicBundle({
      ...custom,
      directory: options.outputDirectory,
      sourceCommit: "",
    });
    expect(calls).toBeGreaterThanOrEqual(2);
    await put(
      "site-index.json",
      JSON.stringify({
        canonical: `${origin}${base}/`,
        records: [
          {
            id: "https://software.example/project",
            type: "SoftwareSourceCode",
            secret: "unapproved",
          },
        ],
      }),
    );
    await expect(buildPublicBundle(custom)).rejects.toThrow("internal field");
  });
});
