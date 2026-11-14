// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

const base = (process.env.SITE_BASE ?? process.env.BASE_PATH ?? "").replace(
  /^\/+|\/+$/g,
  "",
);
export const siteConfig = {
  url: process.env.SITE_URL || "https://heartstronger.org",
  base: base ? `/${base}` : "",
  discovery: { indexing: true },
};
