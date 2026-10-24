// One evidence run: read the pieces, build and serve the evidence project, capture every specimen and Visual Catalog page,
// write `<output>/<id>/<specimen-key>.png` and `<output>/index.html`, and return what was written and the status text.
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { captureCatalog, captureSpecimens, type Captured } from "./capture.ts";
import { catalogFile, indexPage, type PieceEvidence } from "./index-page.ts";
import { readEvidencePieces } from "./pieces.ts";
import { serveEvidence } from "./serve.ts";
import { composeSheet } from "./sheet.ts";
import { formatStatuses, readStatuses } from "./status.ts";

export type EvidenceRequest = Readonly<{ root: string; output: string; label: string; ids: readonly string[] | "all" }>;
export type PieceCount = Readonly<{ id: string; specimens: number; rendered: number; failed: readonly string[]; unanswered: readonly string[];
  catalogPages: number; catalogRendered: number }>;
export type EvidenceResult = Readonly<{ output: string; index: string; status: string; counts: readonly PieceCount[] }>;

async function revision(root: string): Promise<string> {
  const git = (...args: string[]) => promisify(execFile)("git", ["-C", root, ...args]).then(result => result.stdout.trim());
  const [head, dirty] = await Promise.all([git("rev-parse", "--short", "HEAD"), git("status", "--porcelain", "--", "src")]);
  return dirty ? `${head} with uncommitted changes under src/` : head;
}

async function writeCaptured(folder: string, file: string, captured: Captured | undefined) {
  if (captured && "captures" in captured) await writeFile(join(folder, file), await composeSheet(captured.captures));
}

export async function runEvidence(request: EvidenceRequest): Promise<EvidenceResult> {
  const { tree, pieces } = await readEvidencePieces(request.root, request.ids);
  const statuses = await readStatuses(request.root, tree, pieces.map(piece => piece.id));
  await rm(request.output, { recursive: true, force: true });
  await mkdir(request.output, { recursive: true });
  const server = await serveEvidence(pieces);
  const evidence: PieceEvidence[] = [];
  try {
    const browser = await chromium.launch({ headless: true });
    try {
      const destinations = [...new Map(pieces.flatMap(piece => piece.destinations).map(item => [item.id, item])).values()];
      const catalog = await captureCatalog(browser, server.launchUrl, server.origin, destinations);
      for (const [index, piece] of pieces.entries()) {
        const status = statuses[index];
        if (!status) throw new Error(`EVIDENCE_STATUS: no status for ${piece.id}`);
        const folder = join(request.output, piece.id);
        await mkdir(folder, { recursive: true });
        const { results: specimens, unanswered } = server.pages.includes(piece.id) ? await captureSpecimens(browser, server.origin, piece)
          : { results: new Map<number, Captured>(), unanswered: [] };
        for (const specimen of piece.specimens?.list ?? []) await writeCaptured(folder, specimen.file, specimens.get(specimen.index));
        const shown = new Map(piece.destinations.map(destination => [destination.id, catalog.get(destination.id) ?? { error: "not captured" }]));
        for (const [id, captured] of shown) await writeCaptured(folder, catalogFile(id), captured);
        evidence.push({ piece, status, specimens, unanswered, catalog: shown, excluded: server.excluded.get(piece.id) });
      }
    } finally { await browser.close(); }
  } finally { await server.close(); }
  const index = join(request.output, "index.html");
  await writeFile(index, indexPage({ label: request.label, revision: await revision(request.root), createdAt: new Date().toISOString(), pieces: evidence }));
  const counts = evidence.map(({ piece, specimens, unanswered, catalog, excluded }) => {
    const list = piece.specimens?.list ?? [];
    const failed = list.filter(specimen => !("captures" in (specimens.get(specimen.index) ?? { error: "" })))
      .map(specimen => `${specimen.key}: ${excluded ?? errorOf(specimens.get(specimen.index))}`);
    return { id: piece.id, specimens: list.length, rendered: list.length - failed.length, failed, unanswered,
      catalogPages: catalog.size, catalogRendered: [...catalog.values()].filter(item => "captures" in item).length };
  });
  return { output: request.output, index, status: formatStatuses(statuses), counts };
}

const errorOf = (captured: Captured | undefined) => captured && "error" in captured ? captured.error : "not captured";
