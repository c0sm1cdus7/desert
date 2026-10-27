// Builds the inspection family (the Notebook product with its Visual catalog destination) through the test-only evidence
// project, with the fixture pages beside its routes, and serves the build on an ephemeral port inside this process, bound
// to a local controller over a temporary PostgreSQL cluster. The media its player and viewer specimens name is served from
// the repository's fixtures (media.ts). Nothing leaves the temp directory and no manifest is written.
// A piece whose specimens cannot load in a browser (they import node-only modules), or whose fixture page fails
// svelte-check, is excluded with the reason; EVIDENCE_FIXTURE_TYPES if exclusion does not converge; other failures as is.
import type { RequestListener } from "node:http";
import { build } from "esbuild";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openLocalController } from "../../../src/local.ts";
import { buildHumanModule } from "../../../src/web/build.ts";
import { serveLocalSurface } from "../../../src/web/server.ts";
import { createEvidenceProject } from "../../../src/testing/evidence-project.ts";
import { postgresCluster } from "../../../src/testing/postgres-cluster.ts";
import { sdkRoot } from "../../../src/build/svelte/revision.ts";
import { NotebookWeb } from "../../../products/notebook/distributions.ts";
import { InspectionApplication } from "../../fixtures/inspection-product.ts";
import { writeFixturePages } from "./fixture-pages.ts";
import { writeEvidenceMedia } from "./media.ts";
import type { EvidencePiece } from "./pieces.ts";

export type EvidenceServer = Readonly<{ origin: string; launchUrl: string; pages: readonly string[];
  /** Pieces that got no fixture page, with the reason: node-only specimens, or svelte-check's first message. */
  excluded: ReadonlyMap<string, string>; close: () => Promise<void> }>;

/** The ids whose fixture page svelte-check rejected, from the worker's output. */
function rejectedPages(output: string): ReadonlyMap<string, string> {
  const rejected = new Map<string, string>();
  for (const match of output.matchAll(/src\/routes\/evidence\/([a-z0-9-]+)\/\+page\.svelte:\d+:\d+\s*\n?(?:Error|error)[: ]+([^\n]+)/g)) {
    if (!rejected.has(match[1] ?? "")) rejected.set(match[1] ?? "", (match[2] ?? "").trim());
  }
  return rejected;
}

/** Bundles a piece's specimens (and its filler's) for the browser, as Vite will; the first error when they cannot load there. */
async function browserLoadFailure(piece: EvidencePiece): Promise<string | undefined> {
  const entries = [piece.specimens?.request, piece.filler?.specimens?.request].filter(entry => entry !== undefined)
    .map(entry => join(sdkRoot, "src", entry.slice("@desert/".length)));
  try { await build({ entryPoints: entries, bundle: true, write: false, platform: "browser", format: "esm", logLevel: "silent", outdir: "out" }); }
  catch (error) {
    const errors: unknown = error instanceof Error ? Reflect.get(error, "errors") : undefined;
    const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
    const text = typeof first === "object" && first !== null ? Reflect.get(first, "text") : undefined;
    return `its specimens do not load in a browser: ${typeof text === "string" ? text : String(error)}`;
  }
  return undefined;
}

/** The worker builds the whole product plus one route per piece; under load that passes the release build's two minutes. */
const evidenceBuildTimeout = 600_000;

async function buildWithPages(module: string, pieces: readonly EvidencePiece[]) {
  const excluded = new Map<string, string>();
  for (const piece of pieces) {
    const failure = piece.specimens?.list.length ? await browserLoadFailure(piece) : undefined;
    if (failure !== undefined) excluded.set(piece.id, failure);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const project = createEvidenceProject(module, "human", evidenceBuildTimeout);
    const pages = writeFixturePages(project.directory, pieces.filter(piece => !excluded.has(piece.id)));
    writeEvidenceMedia(project.directory, pieces.filter(piece => !excluded.has(piece.id)));
    try {
      await project.run("build");
      return { project, pages, excluded };
    } catch (error) {
      project.close();
      const rejected = rejectedPages(error instanceof Error ? error.message : String(error));
      if (!rejected.size) throw error;
      for (const [id, message] of rejected) excluded.set(id, `its fixture page does not type-check: ${message}`);
    }
  }
  throw new Error(`EVIDENCE_FIXTURE_TYPES: fixture pages still fail svelte-check after excluding ${[...excluded.keys()].join(", ")}`);
}

export async function serveEvidence(pieces: readonly EvidencePiece[]): Promise<EvidenceServer> {
  const module = await buildHumanModule(InspectionApplication, NotebookWeb.surface);
  const { project, pages, excluded } = await buildWithPages(module, pieces);
  const cleanup: (() => unknown)[] = [() => project.close()];
  const close = async () => { for (const step of cleanup.splice(0).reverse()) await step(); };
  try {
    const loaded: unknown = await import(pathToFileURL(join(project.directory, "build/handler.js")).href);
    const handler = typeof loaded === "object" && loaded !== null ? Reflect.get(loaded, "handler") : undefined;
    if (typeof handler !== "function") throw new Error("EVIDENCE_HANDLER: the evidence build exported no request handler");
    const render: RequestListener = (request, response) => { Reflect.apply(handler, undefined, [request, response]); };
    const cluster = postgresCluster();
    cleanup.push(() => cluster.dispose());
    const host = await openLocalController(InspectionApplication, { ...await cluster.database(), roles: ["notes"] });
    cleanup.push(() => host.close());
    const identity = await host.identities.issue("Evidence owner");
    const server = await serveLocalSurface(host.connect(identity.token, "human"), InspectionApplication.digest, render, 0);
    cleanup.push(() => server.close());
    return { origin: server.origin, launchUrl: server.launchUrl, pages, excluded, close };
  } catch (error) { await close(); throw error; }
}
