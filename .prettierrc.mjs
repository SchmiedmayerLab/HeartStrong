// This source file is part of the HeartStrong open-source project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import * as groveConfigurations from "@schmiedmayerlab/grove-configurations";

const { prettierConfig } = groveConfigurations;

export default {
  ...prettierConfig,
  plugins: ["prettier-plugin-astro", ...(prettierConfig.plugins ?? [])],
  overrides: [
    ...(prettierConfig.overrides ?? []),
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
