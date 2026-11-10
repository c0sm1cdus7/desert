import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Reserved surface specs move unchanged; their inherited support imports stay local.
        resolve: {
          alias: [
            {
              find: /^(?:\.\.\/){3,4}tests\/support\//,
              replacement: `${import.meta.dirname}/tests/support/`,
            },
          ],
        },
        test: {
          name: "specs",
          sequence: { groupOrder: 0 },
          maxWorkers: 4,
          include: ["src/**/*.spec.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "laws",
          sequence: { groupOrder: 1 },
          maxWorkers: 4,
          include: ["tests/laws/**/*.spec.ts"],
          environment: "node",
        },
      },
    ],
  },
});
