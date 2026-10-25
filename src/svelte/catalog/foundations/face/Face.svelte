<script lang="ts">
  import { actionIconNames } from '../../../infra/action-icons.ts';
  import { Icon } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  import { glyphTone, type FaceTone } from "./face-tone.ts";
  let { face, compact = false }: CatalogProps<"face"> = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
  let tone: FaceTone = $derived(face.kind === "status" ? face.severity : "neutral");
</script>
<!-- One face primitive (law 9e): the theme's tm-face gives every face the same white ground and hairline; the root takes
     no tone. The tone reaches only the glyph, through glyphTone, so a coloured ground cannot be written here. -->
<div class="bank-face tm-face flex shrink-0 select-none overflow-hidden rounded-[30%]"
  data-piece="face" data-face-kind={face.kind} data-compact={compact || undefined} data-tone={tone} aria-hidden="true">
  <span class={["face-content type-body flex size-full items-center justify-center rounded-[inherit]", glyphTone[tone]]}
    data-face-content data-glyph-tone={tone}>
    {#if face.kind === 'icon'}<Icon name={actionIconNames[face.icon]} size="mark" />{:else if face.kind === "status"}<Icon name="circle-alert" size="mark" />{:else if face.kind === "document"}<Icon name="file-text" size="mark" />{:else}<span class="face-glyph" data-face-glyph>{glyph}</span>{/if}
  </span>
</div>

<style>
  /* Base geometry sits in the components layer, as in theme.css, so contextual rules keep their precedence. */
  @layer components {
    /* A host sizes the face through --face-size (the toolbar's); compact is the smaller mark of a dense list. */
    .bank-face { width:var(--face-size,2rem); height:var(--face-size,2rem); color:var(--muted-foreground); }
    .bank-face[data-compact] { width:1.5rem; height:1.5rem; }
    .face-glyph { font-size:calc(var(--face-size,2rem) * .6); line-height:1; }
    .bank-face[data-compact] .face-glyph { font-size:calc(1.5rem * .6); }
    /* The only tone rules of a face: glyph inks, on the content span (face-tone.ts names them). */
    .glyph-neutral { color:var(--muted-foreground); }
    .glyph-warning { color:var(--warning); }
    .glyph-error { color:var(--destructive); }
    .bank-face[data-face-kind="flag"] .face-glyph { font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
  }
</style>
