// Where catalog files live and which files belong to a fixed category instead of a declaration.
// The only place these paths are written; the gate, the generator and the tests read them from here.
export type CatalogLayout = Readonly<{
  roots: readonly string[];
  vendorFamilies: string;
  infra: string;
  /** The approvals ledger, written only by the owner's approve command. */
  ledger: string;
  fixed: Readonly<Record<string, readonly string[]>>;
  /** Folders under which each declaration kind must live, as `<folder>/<id>/<id>.<kind file>`. */
  pieces: Readonly<Record<"foundation" | "composition" | "mechanism", readonly string[]>>;
}>;

/** Companion files a piece folder may hold beside its entry and parts. */
export const pieceCompanions = Object.freeze(["catalog", "contract", "specimens"] as const);
export const declarationSuffixes = Object.freeze([".catalog.ts", ".mechanism.ts"] as const);

const build = "src/build/svelte";
/** The DESERT tree. Every path a category claims is written here and nowhere else. */
export const DesertLayout: CatalogLayout = Object.freeze({
  roots: ["src/svelte", build],
  vendorFamilies: "src/svelte/vendor/components/ui",
  infra: "src/svelte/infra",
  ledger: "src/svelte/catalog/approvals.json",
  pieces: { foundation: ["src/svelte/catalog/foundations"], composition: ["src/svelte/catalog/compositions", "src/svelte/catalog/renderer"],
    mechanism: ["src/svelte/catalog/mechanisms"] },
  fixed: {
    theme: ["src/svelte/theme.css"],
    "renderer-infrastructure": ["action-adapter.ts", "adapter-catalog.ts", "adapter-contract.ts", "catalog-admissions.ts",
      "catalog-manifest-schema.ts", "catalog-manifest.ts", "catalog-owner-types.ts", "collection-retrieval.ts",
      "renderer-contracts.ts", "renderer-registry.ts"].map(name => `src/svelte/${name}`),
    "vendor-shared": ["utils.ts", "LICENSE", "PROVENANCE.json"].map(name => `src/svelte/vendor/${name}`),
    "build-host": ["bits-scroll-lock.ts", "builder.ts", "config.mjs", "project.ts", "public-catalog-app.d.ts",
      "public-catalog-page.svelte", "revision.ts", "vite.mjs", "worker.mjs", "template/package.json", "template/tsconfig.json",
      "template/src/app.d.ts", "template/src/app.html", "template/src/routes/+layout.svelte", "template/src/routes/+page.svelte",
      "template/src/routes/+page.ts", "template/static/bank-image.svg"].map(name => `${build}/${name}`),
  },
});
