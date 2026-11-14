<!--

This source file is part of the HeartStrong open-source project

SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)

SPDX-License-Identifier: MIT

-->

# HeartStrong

[![Build and Test](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/build-and-test.yml)
[![Deployment](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/deploy-pages.yml)
[![CodeQL](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/codeql.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/codeql.yml)
[![REUSE status](https://api.reuse.software/badge/github.com/SchmiedmayerLab/HeartStrong)](https://api.reuse.software/info/github.com/SchmiedmayerLab/HeartStrong)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

HeartStrong is a static patient education website that extends the HeartStrong booklet with heart failure education, guided goal setting, treatment guidance, and printable visit resources.

## Overview

The site is designed to feel calm, clear, and supportive on both desktop and mobile while staying simple to host on GitHub Pages.

It follows the booklet structure with dedicated pages for:

- Welcome
- HF Basics
- Goal Setting
- Treatment Options
- Resources

## Technology Stack

- [Astro](https://astro.build) for a static multi-page site
- Plain CSS with a liquid-glass-inspired visual system
- Small vanilla TypeScript modules for interactive behaviors
- [Fontsource](https://fontsource.org/) for self-hosted web fonts
- [Vitest](https://vitest.dev) for local automated testing
- [ESLint](https://eslint.org) and [Prettier](https://prettier.io/) via the shared [Grove web configuration package](https://github.com/SchmiedmayerLab/grove-ts/tree/main/packages/configurations), with Astro-specific overrides kept local
- GitHub Actions for CI, CodeQL, markdown link checking, REUSE compliance, sitemap generation, and GitHub Pages deployment

## Local Development

HeartStrong recommends Node.js 24 or newer. The repository includes a [`.node-version`](.node-version) file for toolchains that can pick it up automatically.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Start the local development server:

   ```bash
   npm run dev
   ```

3. Open the local Astro server URL shown in the terminal.

## Quality Checks

Run the same core checks locally that GitHub Actions uses in CI:

```bash
npm run format:check
npm run lint
npm run validate
```

## Deployment

Merging source changes runs CI without deploying. Publishing is configured for
`https://heartstronger.org/` in `publishing.config.mjs`. After release approval, use a
manual workflow dispatch from `main` or publish a stable `vMAJOR.MINOR.PATCH`
release whose commit belongs to `main`. Release tags identify website versions;
`package.json` does not need a matching version because this package is not
published to npm. See [docs/RELEASES.md](docs/RELEASES.md) for setup, releases,
and rollback.

The configured destination must exactly match GitHub Pages. CI packages approved
pages and their assets into `_site/`; browsers test that artifact, deployment
uploads the same bytes, and live verification checks their hashes. The adjacent
`release-manifest.json` is never website content.

Run `npm run validate:all` before proposing a release. The portability check
exercises a repository subpath using `SITE_URL` and `SITE_BASE`. See
[website infrastructure](docs/INFRASTRUCTURE.md) for maintenance requirements.

## Contributing

Contributions to this project are welcome. Please make sure to read the [contribution guidelines](https://github.com/SchmiedmayerLab/.github/blob/main/CONTRIBUTING.md) and the [contributor covenant code of conduct](https://github.com/SchmiedmayerLab/.github/blob/main/CODE_OF_CONDUCT.md) first. You can find a list of contributors in the [CONTRIBUTORS.md](CONTRIBUTORS.md) file.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for more information.

## Citation

If you use this software, please cite it using the metadata in [CITATION.cff](CITATION.cff), which GitHub surfaces through the [_Cite this repository_](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files) button.

## Our Research

For more information, visit the [Schmiedmayer Lab GitHub organization](https://github.com/SchmiedmayerLab).

![Schmiedmayer Lab](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/footer-light.png#gh-light-mode-only)
![Schmiedmayer Lab](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/footer-dark.png#gh-dark-mode-only)
