import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  validateDeploymentManifest,
  verifyDeployment,
} from "../../scripts/verify-deployment.mjs";

const fixture = (destination = "https://research.example/project/") => {
  const data = new Map<string, string>();
  const files = [
    "index.html",
    "404.html",
    "news/example/index.html",
    "_astro/site.hash.css",
  ].map((path) => {
    const content = `Public ${path}`;
    const route =
      path === "index.html" ? "./" : path.replace(/\/index\.html$/, "/");
    data.set(new URL(route, destination).href, content);
    return {
      path,
      bytes: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  });
  const manifest = {
    schemaVersion: 1,
    origin: new URL(destination).origin,
    base: new URL(destination).pathname.replace(/\/$/, ""),
    sourceCommit: "a".repeat(40),
    files,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    excluded: ["_astro/unused.hash.png"],
  };
  const fetchImpl = vi.fn<typeof fetch>((input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return Promise.resolve(
      new Response(data.get(url.href) ?? "Not found", {
        status: data.has(url.href) ? 200 : 404,
      }),
    );
  });
  return {
    data,
    manifest,
    options: {
      manifest,
      expectedUrl: destination,
      deploymentUrl: destination,
      sourceCommit: manifest.sourceCommit,
      fetchImpl,
      attempts: 1,
      delayMs: 0,
    },
  };
};

describe("exact-artifact deployment verification", () => {
  it.each(["https://research.example/", "https://group.github.io/project/"])(
    "verifies arbitrary approved destination %s",
    async (destination) => {
      const { options } = fixture(destination);
      await expect(verifyDeployment(options)).resolves.toMatchObject({
        url: destination,
        files: 4,
      });
      for (const call of options.fetchImpl.mock.calls)
        expect(
          new URL(call[0] instanceof Request ? call[0].url : String(call[0]))
            .origin,
        ).toBe(new URL(destination).origin);
    },
  );
  it("rejects wrong origins and commit identities before requesting anything", async () => {
    const { options } = fixture();
    await expect(
      verifyDeployment({
        ...options,
        deploymentUrl: "https://unapproved.example/",
      }),
    ).rejects.toThrow("approved destination");
    await expect(
      verifyDeployment({ ...options, sourceCommit: "b".repeat(40) }),
    ).rejects.toThrow("source commit");
    expect(options.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects modified live content", async () => {
    const { options, data } = fixture();
    data.set(options.expectedUrl, "Old deployment");
    await expect(verifyDeployment(options)).rejects.toThrow("checksum");
  });
  it("requires source and excluded paths to return 404", async () => {
    const { options, data } = fixture();
    data.set(new URL(".env", options.expectedUrl).href, "Unexpected");
    await expect(verifyDeployment(options)).rejects.toThrow("nonpublic path");
  });
  it.each([
    "../private",
    "/absolute",
    "src/private.js",
    "source.js.map",
    "asset.js?key=1",
  ])("rejects unsafe path %s", (path) => {
    const { options, manifest } = fixture();
    manifest.files[0].path = path;
    expect(() =>
      validateDeploymentManifest(
        manifest,
        options.expectedUrl,
        options.expectedUrl,
      ),
    ).toThrow("invalid or nonpublic");
  });
  it("rejects redirects and bounds retries", async () => {
    const { options } = fixture();
    await expect(
      verifyDeployment({
        ...options,
        fetchImpl: () => Promise.resolve(new Response(null, { status: 302 })),
        attempts: 1,
      }),
    ).rejects.toThrow("redirect");
    await expect(
      verifyDeployment({ ...options, attempts: 13 }),
    ).rejects.toThrow("bounded");
  });
});
