// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

const execute = promisify(execFile);
const script = fileURLToPath(
  new URL("../../scripts/audit-markdown-links.mjs", import.meta.url),
);
const directories: string[] = [];

const audit = async (content: string) => {
  const directory = await mkdtemp(join(tmpdir(), "markdown-link-test-"));
  directories.push(directory);
  await writeFile(join(directory, "README.md"), content);
  return execute(process.execPath, [script], { cwd: directory });
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

it("extracts heading text from HTML with angle brackets inside attributes", async () => {
  await expect(
    audit(
      '# A <span title="1 > 0">useful</span> heading\n\n[Heading](#a-useful-heading)\n',
    ),
  ).resolves.toBeDefined();
});

it("still rejects a missing heading fragment", async () => {
  await expect(
    audit("# A <strong>real</strong> heading\n\n[Missing](#not-a-heading)\n"),
  ).rejects.toMatchObject({ code: 1 });
});
