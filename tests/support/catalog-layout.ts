// The layout every catalog unit test starts from: a small tree with the same roles as DESERT's.
// A test that needs another shape overrides only the field it is about.
import type { CatalogLayout } from "../../src/authoring/catalog/layout.ts";

export const testLayout = (overrides: Partial<CatalogLayout> = {}): CatalogLayout => ({
  roots: ["src/svelte"], vendorFamilies: "src/svelte/vendor/components/ui", infra: "src/svelte/infra", testing: "src/testing", aliases: [["@desert/svelte/", "src/svelte/"], ["@desert/", "src/"]] as const,
  ledger: "src/svelte/catalog/approvals.json", fixed: {},
  generated: { index: "src/svelte/catalog/index.ts", manifest: "src/svelte/catalog/manifest.json", types: "src/svelte/catalog/types.d.ts",
    renderers: "src/svelte/renderer-registry.ts", sources: "src/svelte/catalog/sources.ts" }, rendererTypes: "src/svelte/renderer-contracts.ts",
  messages: { folder: "src/messages", keys: "src/messages/keys.ts", namespaces: {} },
  gate: { roots: ["src/authoring/catalog"], modules: ["src/authoring/catalog/gate/run.ts"], required: ["src/svelte/theme.css"], reads: [] },
  nonvisual: { roots: [], browserSession: "src/web/client/browser-session.ts" },
  rendererFolder: "src/svelte/catalog/renderer", dispatch: {},
  pieces: { foundation: ["src/svelte/catalog/foundations"], composition: ["src/svelte/catalog/compositions"],
    mechanism: ["src/svelte/catalog/mechanisms"] },
  ...overrides,
});
