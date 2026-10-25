// The test fixture pages of the evidence project: one SvelteKit route per piece, `/evidence/<id>`, that mounts the piece's
// own owner entry once per specimen with the specimen's own props, under the catalog appearance the product mounts. Nothing
// here draws the piece: a `children` slot is filled with the first specimens of the first accepted piece that has any,
// rendered by that piece's own owner. A specimen that throws is caught by a boundary and reported, never replaced.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EvidencePiece } from "./pieces.ts";

export const evidenceRoute = (id: string) => `/evidence/${id}`;
/** How many specimens of the filler piece fill a `children` slot. */
export const fillerCount = 3;

function pageSource(piece: EvidencePiece): string {
  const specimens = piece.specimens;
  if (!specimens) throw new Error(`EVIDENCE_NO_SPECIMENS: ${piece.id}`);
  const filler = piece.filler?.specimens;
  const imports = [
    `import { AppearanceRoot } from "@desert/svelte/catalog/index.ts";`,
    `import Piece from ${JSON.stringify(piece.entry)};`,
    `import { ${specimens.binding} as specimens } from ${JSON.stringify(specimens.request)};`,
    ...piece.filler && filler ? [`import Filler from ${JSON.stringify(piece.filler.entry)};`,
      `import { ${filler.binding} as fillers } from ${JSON.stringify(filler.request)};`] : [],
  ];
  const children = piece.filler && filler
    ? `{#snippet children()}{#each fillers.slice(0, ${fillerCount}) as filler, at (at)}<Filler {...filler.props} />{/each}{/snippet}` : "";
  return `<script lang="ts">
  ${imports.join("\n  ")}
</script>

<AppearanceRoot />
<main data-evidence-piece=${JSON.stringify(piece.id)}>
  {#each specimens as specimen, index (index)}
    <section data-evidence-specimen={index}>
      <svelte:boundary>
        <Piece {...specimen.props}>${children}</Piece>
        {#snippet failed(error)}<p data-evidence-failed>{error instanceof Error ? error.message : String(error)}</p>{/snippet}
      </svelte:boundary>
    </section>
  {/each}
</main>

<!-- A stylesheet, not a style attribute: the renderer CSP refuses inline style attributes. -->
<style>
  section { display:flow-root; padding:16px; }
</style>
`;
}

/** Writes the fixture routes into a staged evidence project; returns the ids that got a page. */
export function writeFixturePages(directory: string, pieces: readonly EvidencePiece[]): readonly string[] {
  const routes = join(directory, "src/routes/evidence");
  mkdirSync(routes, { recursive: true });
  writeFileSync(join(routes, "+layout.ts"), "export const ssr = false;\nexport const prerender = true;\n");
  const written: string[] = [];
  for (const piece of pieces) {
    if (!piece.specimens?.list.length) continue;
    mkdirSync(join(routes, piece.id), { recursive: true });
    writeFileSync(join(routes, piece.id, "+page.svelte"), pageSource(piece));
    written.push(piece.id);
  }
  return written;
}
