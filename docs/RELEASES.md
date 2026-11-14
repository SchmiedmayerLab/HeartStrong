<!--
SPDX-FileCopyrightText: 2026 Schmiedmayer Lab and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Website releases

Git tags and GitHub releases identify deployed website versions. These private
website packages are not published to npm: `package.json` and `package-lock.json`
versions do not need to change for a website release. Dependency updates still
require the usual manifest and lockfile changes.

## Configure a site once

1. Set the production origin and base path in `site.config.mjs`. Replace template
   content, disable `templateMode` if present, and choose public search indexing.
2. In `publishing.config.mjs`, set `destination` to the full production HTTPS URL
   with a trailing slash and set `enabled: true` after destination/content review.
   Keep the public bundle's route and asset policy specific to the site.
3. In GitHub Pages settings, select GitHub Actions, configure the same destination,
   and enforce HTTPS for a custom domain after its certificate is approved.
4. Configure the `github-pages` environment to allow branch `main` and tags `v*`.
   Preserve required deployment approvals. The workflow additionally rejects
   prereleases, invalid version tags, and release commits outside `main` history.

A new template starts with publishing disabled. Enabling publishing permits the
release workflow to run; it does not deploy on a push or authorize a release.

## Publish a release

1. Merge reviewed changes after CI passes. Run the repository's documented local
   validation and browser checks, then review the public bundle and destination.
2. Choose an unused `vMAJOR.MINOR.PATCH` tag based on the repository's release
   history. For example, the next minor release after `v1.0.0` is `v1.1.0`.
   If there are no releases, explicitly choose the initial website version.
3. Create a signed annotated tag on the approved commit in `main` history. Verify
   its signature and commit before pushing, then verify the published tag.
4. Publish a stable GitHub release for that existing tag with reviewed release
   notes. Draft releases and tag pushes alone do not deploy. Do not mark it as a
   prerelease; the deployment workflow accepts stable releases only.
5. Watch **Deploy to GitHub Pages** through validation, upload, deployment, and
   live verification. Validation tests the exact public artifact that is uploaded;
   the final job compares live files with its checksums and checks excluded paths.
6. Inspect the live site's primary routes, navigation, forms, and appearance.

A manual workflow dispatch from `main` is also supported for an explicitly
approved deployment. Dispatches from other branches are rejected.

## Correct a deployment

Keep release tags immutable. Revert or fix the source through a reviewed PR,
validate the resulting `main`, and publish a new patch release. A failure before
deployment leaves the previous site intact. A live-verification failure occurs
after publication and requires investigation or an approved corrective deployment.
