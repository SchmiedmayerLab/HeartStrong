# Website infrastructure

Baseline: WebsiteTemplate revision `5bcfe28699ed03152c839bed9279c8ed9d62eac2`.

Use the exact Node and npm versions declared in this repository. Keep the
Playwright package and browser-container version and digest synchronized.
Run `npm run validate`, the configured browser tests, and `npm audit` before
proposing changes. Repository-subpath checks exercise a separate build.

ESLint and Prettier use `@schmiedmayerlab/grove-configurations`. Keep local
rule exceptions in `eslint.config.mjs` together with their reason.

Weekly version updates are grouped across npm and GitHub Actions. Security
updates have their own groups; TypeScript remains below 6.1 until peer support
is available. Review release dates and peer requirements before upgrading.

Production deployment is separate from merging source changes. Manual dispatch
must use `main`; release workflows accept stable releases belonging to `main`.
Verify destination, content, and required environment approvals before deploying.
Publishing configuration does not grant approval to release new content.
[RELEASES.md](RELEASES.md) documents the shared tag-based release procedure;
website releases do not require npm package-version changes.

Site-specific content, routes, public-data schemas, assets, and product tests
remain local. Review those adapters when adopting later template changes.
