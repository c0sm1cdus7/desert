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
/** The padding around every specimen, and the block size of the stage a filling specimen fills (both in px). */
export const specimenPadding = 16, fillStage = 240;

function pageSource(piece: EvidencePiece): string {
  const specimens = piece.specimens;
  if (!specimens) throw new Error(`EVIDENCE_NO_SPECIMENS: ${piece.id}`);
  const filler = piece.filler?.specimens;
  const imports = [
    `import { AppearanceRoot } from "@desert/svelte/catalog/index.ts";`,
    `import { provideFileHost } from "@desert/svelte/infra/file-host-context.ts";`,
    `import Piece from ${JSON.stringify(piece.entry)};`,
    `import { ${specimens.binding} as specimens } from ${JSON.stringify(specimens.request)};`,
    ...piece.filler && filler ? [`import Filler from ${JSON.stringify(piece.filler.entry)};`,
      `import { ${filler.binding} as fillers } from ${JSON.stringify(filler.request)};`] : [],
  ];
  const children = piece.filler && filler
    ? `{#snippet children()}{#each fillers.slice(0, ${fillerCount}) as filler, at (at)}<Filler {...filler.props} />{/each}{/snippet}` : "";
  return `<script lang="ts">
  import { onMount } from "svelte";
  ${imports.join("\n  ")}
  // A piece that chooses local files (Files) reads the file host its product provides above it; the page provides one.
  provideFileHost();
  // A piece drawn wholly out of flow (a wallpaper or a main surface filling its container, an overlay mark) has its
  // section as its container, and gets a stage to fill instead of collapsing to its padding or spilling over the
  // specimens around it.
  let staged = $state<readonly number[]>([]);
  onMount(() => {
    staged = [...document.querySelectorAll<HTMLElement>("[data-evidence-specimen]")].flatMap(section => {
      const pieces = [...section.children], outOfFlow = (node: Element) => getComputedStyle(node).position === "absolute";
      return pieces.length && pieces.every(outOfFlow) ? [Number(section.dataset.evidenceSpecimen)] : [];
    });
  });
</script>

<AppearanceRoot />
<main data-evidence-piece=${JSON.stringify(piece.id)}>
  {#each specimens as specimen, index (index)}
    <section data-evidence-specimen={index} data-evidence-stage={staged.includes(index) ? "fill" : undefined}>
      <svelte:boundary>
        <Piece {...specimen.props}>${children}</Piece>
        {#snippet failed(error)}<p data-evidence-failed>{error instanceof Error ? error.message : String(error)}</p>{/snippet}
      </svelte:boundary>
    </section>
  {/each}
</main>

<!-- A stylesheet, not a style attribute: the renderer CSP refuses inline style attributes. -->
<style>
  section { position:relative; isolation:isolate; display:flow-root; padding:${specimenPadding}px; }
  section[data-evidence-stage="fill"] { block-size:${fillStage}px; }
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
