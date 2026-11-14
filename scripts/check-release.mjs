// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { siteConfig } from "../site.config.mjs";
import { publishing } from "../publishing.config.mjs";
import {
  deploymentDestination,
  validateReleaseEvent,
} from "./release-policy.mjs";

const destination = deploymentDestination(publishing, siteConfig.templateMode);
if (!destination) {
  appendFileSync(process.env.GITHUB_OUTPUT, "enabled=false\n");
  process.stdout.write(
    "Deployment is disabled in publishing.config.mjs. No publication attempted.\n",
  );
} else {
  validateReleaseEvent({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    tag: process.env.RELEASE_TAG,
    draft: process.env.RELEASE_DRAFT,
    prerelease: process.env.RELEASE_PRERELEASE,
  });
  if (process.env.GITHUB_EVENT_NAME === "release") {
    const commit = execFileSync(
      "git",
      ["rev-parse", `${process.env.RELEASE_TAG}^{commit}`],
      {
        encoding: "utf8",
      },
    ).trim();
    if (commit !== process.env.GITHUB_SHA)
      throw new Error("Release tag does not match checked out commit");
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "origin/main"]);
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `enabled=true\norigin=${destination.origin}\nbase=${destination.base}\n`,
  );
}
