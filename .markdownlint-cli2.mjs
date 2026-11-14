export default {
  config: {
    MD013: false,
    MD024: { siblings_only: true },
    MD033: false,
    MD041: false,
  },
  globs: [
    "**/*.md",
    "!.git/**",
    "!node_modules/**",
    "!dist/**",
    "!_site/**",
    "!.astro/**",
    "!coverage/**",
    "!playwright-report/**",
    "!test-results/**",
  ],
};
