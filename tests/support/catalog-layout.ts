// The layout every catalog unit test starts from: a small tree with the same roles as DESERT's.
// A test that needs another shape overrides only the field it is about.
import type { CatalogLayout } from "../../src/authoring/catalog/layout.ts";

export const testLayout = (overrides: Partial<CatalogLayout> = {}): CatalogLayout => ({
  roots: ["src/svelte"], vendorFamilies: "src/svelte/vendor/components/ui", infra: "src/svelte/infra", testing: "src/testing",
  ledger: "src/svelte/catalog/approvals.json", fixed: {},
  generated: { index: "src/svelte/catalog/index.ts", manifest: "src/svelte/catalog/manifest.json", types: "src/svelte/catalog/types.d.ts" },
  gate: { roots: ["src/authoring/catalog"], modules: ["src/authoring/catalog/gate/run.ts"], required: ["src/svelte/theme.css"], reads: [] },
  pieces: { foundation: ["src/svelte/catalog/foundations"], composition: ["src/svelte/catalog/compositions"],
    mechanism: ["src/svelte/catalog/mechanisms"] },
  ...overrides,
});
