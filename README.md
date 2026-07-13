<!--
This source file is part of the Stanford HeartStrong open-source project

SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)

SPDX-License-Identifier: MIT
-->

# HeartStrong

[![Build and Test](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/build-and-test.yml)
[![Deploy to GitHub Pages](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/deploy-pages.yml)
[![CodeQL](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/codeql.yml/badge.svg)](https://github.com/SchmiedmayerLab/HeartStrong/actions/workflows/codeql.yml)

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
- [ESLint](https://eslint.org) and [Prettier](https://prettier.io/) via the shared [Stanford Spezi web configuration package](https://github.com/StanfordSpezi/spezi-web-configurations), with Astro-specific overrides kept local
- GitHub Actions for CI, CodeQL, markdown link checking, REUSE compliance, sitemap generation, and GitHub Pages deployment

## Local Development

HeartStrong recommends Node.js 24 or newer. The repository includes a [`.node-version`](.node-version) file for toolchains that can pick it up automatically.

1. Install dependencies:

```bash
npm install
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

The site is configured for GitHub Pages deployment through [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

To publish it:

1. Push the repository to GitHub.
2. In the repository settings, configure Pages to deploy from **GitHub Actions**.
3. Push to `main` or run the workflow manually.

The Astro configuration supports both repository-path builds and custom-domain deployments through the GitHub Actions environment, so deployments like `https://heartstronger.org/` work without manual path edits.

## License

This project is licensed under the MIT License. See [Licenses](LICENSES) for more information.

## Contributors

This project is developed as part of the Schmiedmayer Lab at Stanford University.
See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a full list of all contributors.

## Our Research

For more information, visit the [Schmiedmayer Lab GitHub organization](https://github.com/SchmiedmayerLab).

![Stanford and Stanford Medicine logos](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/stanford-footer-light.png#gh-light-mode-only)
![Stanford and Stanford Medicine logos](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/stanford-footer-dark.png#gh-dark-mode-only)
