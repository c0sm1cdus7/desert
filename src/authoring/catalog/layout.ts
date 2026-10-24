// Where catalog files live and which files belong to a fixed category instead of a declaration.
// The only place these paths are written; the gate, the generator and the tests read them from here.
export type CatalogLayout = Readonly<{
  roots: readonly string[];
  vendorFamilies: string;
  infra: string;
  /** Test-only modules (the evidence project); no visual-root file may import them (rule I, N54). */
  testing: string;
  /** Import aliases of the tree, longest prefix first (the same ones config.mjs and tsconfig.json resolve). */
  aliases: readonly (readonly [prefix: string, target: string])[];
  /** The approvals ledger, written only by the owner's approve command. */
  ledger: string;
  fixed: Readonly<Record<string, readonly string[]>>;
  /** Files written only by `node scripts/catalog.ts --write` from the declarations (rule C). */
  generated: Readonly<{ index: string; manifest: string; types: string }>;
  /** Rule P: every module of the gate, the folders that hold only those modules, and other files the gate needs.
   * `reads`: sources outside the visual roots that content rules read as data (rule K reads the view grammar). */
  gate: Readonly<{ roots: readonly string[]; modules: readonly string[]; required: readonly string[]; reads: readonly string[] }>;
  /** Folders under which each declaration kind must live, as `<folder>/<id>/<id>.<kind file>`. */
  pieces: Readonly<Record<"foundation" | "composition" | "mechanism", readonly string[]>>;
}>;

/** Companion files a piece folder may hold beside its entry and parts. */
export const pieceCompanions = Object.freeze(["catalog", "contract", "specimens"] as const);
export const declarationSuffixes = Object.freeze([".catalog.ts", ".mechanism.ts"] as const);
/** The mechanism that owns the design tokens and the only global CSS; its id is fixed. */
export const themeMechanism = "theme";

const build = "src/build/svelte", theme = "src/svelte/theme.css";
const modules = (folder: string, names: readonly string[]) => names.map(name => `${folder}/${name}`);
/** The DESERT tree. Every path a category claims is written here and nowhere else. */
export const DesertLayout: CatalogLayout = Object.freeze({
  roots: ["src/svelte", build],
  vendorFamilies: "src/svelte/vendor/components/ui",
  infra: "src/svelte/infra",
  testing: "src/testing",
  aliases: [["@desert/svelte/", "src/svelte/"], ["@desert/", "src/"]] as const,
  ledger: "src/svelte/catalog/approvals.json",
  generated: { index: "src/svelte/catalog/index.ts", manifest: "src/svelte/catalog/manifest.json", types: "src/svelte/catalog/types.d.ts" },
  gate: {
    roots: ["src/authoring/catalog", "src/authoring/visual-boundary", "src/authoring/web-catalog"],
    modules: [
      ...modules("src/authoring/catalog", ["approvals-schema.ts", "declaration-schema.ts", "define.ts", "digest.ts", "generate.ts", "layout.ts",
        "normalize-source.ts", "read-contract.ts", "read-declaration.ts"]),
      ...modules("src/authoring/catalog/gate", ["approvals.ts", "composition-dispatch.ts", "composition-template.ts", "content-rules.ts", "context.ts",
        "css-ownership.ts", "declarations.ts", "derivation.ts", "dom-access.ts", "emitted-css.ts", "grammar.ts", "inventory.ts", "ledger.ts",
        "native-controls.ts", "owner-imports.ts", "ownership.ts", "parse.ts", "presentation.ts", "resolve-imports.ts", "run.ts",
        "sources.ts", "specimens.ts", "stylesheet.ts", "template-artifacts.ts", "violation.ts"]),
      // The previous gate stays on the build path until slice 1 ports its assertions into the rules above.
      ...modules("src/authoring/visual-boundary", ["adapter-globals.ts", "adapter.ts", "bootstrap.ts", "closed.ts", "composition.ts",
        "dependency-graph.ts", "dispatch-contract.ts", "dispatch-script.ts", "dispatch.ts", "dom-ownership.ts", "finite-inputs.ts",
        "gateway.ts", "inspect.ts", "interpreter-sources.ts", "inventory.ts", "model.ts", "nonvisual-capabilities.ts",
        "opaque-execution.ts", "runtime-globals.ts", "script.ts", "source-request.ts", "source.ts", "toolbar-css.ts",
        "toolbar-placement.ts", "toolbar-properties.ts", "toolbar.ts", "unload-capability.ts", "walk.ts"]),
      ...modules("src/authoring/web-catalog", ["check.ts", "derive.ts", "manifest.ts"]),
    ],
    required: [theme],
    reads: ["src/views/components.ts", "src/views/schema.ts", "src/views/grammar-map.ts",
      "src/interaction/information-content.ts", "src/interaction/extended-nodes.ts"],
  },
  pieces: { foundation: ["src/svelte/catalog/foundations"], composition: ["src/svelte/catalog/compositions", "src/svelte/catalog/renderer"],
    mechanism: ["src/svelte/catalog/mechanisms"] },
  fixed: {
    theme: [theme],
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
