// SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

/** Require an explicit HTTPS destination; never infer a publication target. */
export function deploymentDestination(policy, templateMode) {
  if (!policy.enabled) return undefined;
  if (templateMode)
    throw new Error(
      "Replace example content and disable templateMode before deployment",
    );
  const url = new URL(policy.destination);
  if (
    url.protocol !== "https:" ||
    url.href !== policy.destination ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^\/(?:[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*\/)*$/.test(url.pathname) ||
    /(?:^|\.)example\.(?:edu|com|org)$/.test(url.hostname)
  ) {
    throw new Error(
      "Configure an explicit production HTTPS origin and optional project path, ending in /",
    );
  }
  return { origin: url.origin, base: url.pathname.replace(/\/$/, "") };
}

export function validateReleaseEvent({
  event,
  ref,
  tag = "",
  draft = "",
  prerelease = "",
}) {
  if (event === "workflow_dispatch" && ref === "refs/heads/main") return;
  if (
    event === "release" &&
    draft === "false" &&
    prerelease === "false" &&
    /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(tag) &&
    ref === `refs/tags/${tag}`
  )
    return;
  throw new Error(
    "Deploy only a stable vMAJOR.MINOR.PATCH release or a manual dispatch from main",
  );
}
