// Where catalog files live and which files belong to a fixed category instead of a declaration.
// The only place these paths are written; the gate, the generator and the tests read them from here.
import type { CompositionData } from "./declaration-schema.ts";

type DispatchGrammar = NonNullable<CompositionData["dispatch"]>;
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
  /** Files written only by `node scripts/catalog.ts --write` from the declarations (rule C). `renderers`: the table of the
   * piece each resolved node kind renders through, typed by `rendererTypes`' NodeRendererTable; `sources`: each piece's
   * entry file, as data the visible catalog shows. */
  generated: Readonly<{ index: string; manifest: string; types: string; renderers: string; sources: string }>;
  rendererTypes: string;
  /** Rule P: every module of the gate, the folders that hold only those modules, and other files the gate needs.
   * `reads`: sources outside the visual roots that content rules read as data (rule K reads the view grammar). */
  gate: Readonly<{ roots: readonly string[]; modules: readonly string[]; required: readonly string[]; reads: readonly string[] }>;
  /** Rule N: code that stays nonvisual wherever it runs. Every file under `roots` (the interpreter, dormant files included)
   * and every module outside the visual roots that the page reaches; `browserSession` holds the one host capability. */
  nonvisual: Readonly<{ roots: readonly string[]; browserSession: string }>;
  /** Rule D2: for a dispatch grammar, the input its dispatcher receives and the validator (module, export) that admits it
   * before any branch reads it. A grammar without an entry has no admission step yet. */
  dispatch: Readonly<Partial<Record<DispatchGrammar, Readonly<{ input: string; validator: Readonly<{ module: string; name: string }> }>>>>;
  /** The compositions that render data by selecting pieces (dispatchers and frames): they hold no browser capability at all. */
  rendererFolder: string;
  /** Folders under which each declaration kind must live, as `<folder>/<id>/<id>.<kind file>`. */
  pieces: Readonly<Record<"foundation" | "composition" | "mechanism", readonly string[]>>;
}>;

/** Companion files a piece folder may hold beside its entry and parts. */
export const pieceCompanions = Object.freeze(["catalog", "contract", "specimens"] as const);
export const declarationSuffixes = Object.freeze([".catalog.ts", ".mechanism.ts"] as const);
/** The mechanism that owns the design tokens and the only global CSS; its id is fixed. */
export const themeMechanism = "theme";

const build = "src/build/svelte", theme = "src/svelte/theme.css", rendererFolder = "src/svelte/catalog/renderer";
const rendererTypes = "src/svelte/renderer-contracts.ts";
const modules = (folder: string, names: readonly string[]) => names.map(name => `${folder}/${name}`);
/** The DESERT tree. Every path a category claims is written here and nowhere else. */
export const DesertLayout: CatalogLayout = Object.freeze({
  roots: ["src/svelte", build],
  vendorFamilies: "src/svelte/vendor/components/ui",
  infra: "src/svelte/infra",
  testing: "src/testing",
  aliases: [["@desert/svelte/", "src/svelte/"], ["@desert/", "src/"]] as const,
  ledger: "src/svelte/catalog/approvals.json",
  generated: { index: "src/svelte/catalog/index.ts", manifest: "src/svelte/catalog/manifest.json", types: "src/svelte/catalog/types.d.ts",
    renderers: "src/svelte/renderer-registry.ts", sources: "src/svelte/catalog/sources.ts" },
  rendererTypes,
  gate: {
    roots: ["src/authoring/catalog"],
    modules: [
      ...modules("src/authoring/catalog", ["approvals-schema.ts", "declaration-schema.ts", "define.ts", "digest.ts", "generate.ts", "layout.ts",
        "normalize-source.ts", "read-contract.ts", "read-declaration.ts"]),
      ...modules("src/authoring/catalog/gate", ["approvals.ts", "browser-host.ts", "build-gate.ts", "component-runtime.ts", "composition-dispatch.ts", "contract-types.ts",
        "composition-template.ts", "content-rules.ts", "context.ts", "css-marks.ts", "css-ownership.ts", "declarations.ts", "derivation.ts",
        "dispatch-admission.ts", "dom-access.ts", "emitted-css.ts", "grammar.ts", "inventory.ts", "ledger.ts", "native-controls.ts",
        "nonvisual-sources.ts", "nonvisual.ts", "opaque-source.ts", "owner-imports.ts", "ownership.ts", "parse.ts", "presentation-contract.ts", "presentation.ts",
        "resolve-imports.ts", "run.ts", "runtime-globals.ts", "sources.ts", "specimens.ts", "stylesheet.ts", "template-artifacts.ts",
        "template-assets.ts", "violation.ts", "walk.ts"]),
    ],
    required: [theme, rendererTypes],
    reads: ["src/views/components.ts", "src/views/schema.ts", "src/views/grammar-map.ts",
      "src/interaction/information-content.ts", "src/interaction/extended-nodes.ts"],
  },
  nonvisual: { roots: ["src/web/client"], browserSession: "src/web/client/browser-session.ts" },
  rendererFolder,
  dispatch: { "resolved-node": { input: "node", validator: { module: "src/interaction/resolved-node.ts", name: "resolvedNode" } } },
  pieces: { foundation: ["src/svelte/catalog/foundations"], composition: ["src/svelte/catalog/compositions", rendererFolder],
    mechanism: ["src/svelte/catalog/mechanisms"] },
  fixed: {
    theme: [theme],
    "renderer-infrastructure": [...["action-adapter.ts", "collection-retrieval.ts"].map(name => `src/svelte/${name}`), rendererTypes],
    "vendor-shared": ["utils.ts", "LICENSE", "PROVENANCE.json"].map(name => `src/svelte/vendor/${name}`),
    "build-host": ["bits-scroll-lock.ts", "builder.ts", "config.mjs", "project.ts", "public-catalog-app.d.ts",
      "public-catalog-page.svelte", "revision.ts", "vite.mjs", "worker.mjs", "template/package.json", "template/tsconfig.json",
      "template/src/app.d.ts", "template/src/app.html", "template/src/routes/+layout.svelte", "template/src/routes/+page.svelte",
      "template/src/routes/+page.ts", "template/static/bank-image.svg"].map(name => `${build}/${name}`),
  },
});
