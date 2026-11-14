// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig } from "../site.config.mjs";

const root =
  process.env.SITE_OUTPUT_DIR ?
    resolve(process.env.SITE_OUTPUT_DIR)
  : fileURLToPath(new URL("../dist/", import.meta.url));
const host = process.env.PREVIEW_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PREVIEW_PORT ?? "4322", 10);
const basePath =
  siteConfig.base ? `/${siteConfig.base.replace(/^\/+|\/+$/g, "")}` : "";
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function sendFile(response, filePath, statusCode = 200) {
  response.statusCode = statusCode;
  response.setHeader(
    "Content-Type",
    contentTypes.get(extname(filePath)) ?? "application/octet-stream",
  );
  response.setHeader("Cache-Control", "no-store");
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? host}`,
    );
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (basePath) {
      if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
        sendFile(response, join(root, "404.html"), 404);
        return;
      }
      pathname = pathname.slice(basePath.length) || "/";
    }

    const relativePath =
      pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    let filePath = resolve(root, `.${relativePath}`);

    if (relative(root, filePath).startsWith("..")) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if ((await stat(filePath)).isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    sendFile(response, filePath);
  } catch {
    sendFile(response, join(root, "404.html"), 404);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Serving the built site at http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
