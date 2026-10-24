<script lang="ts">
  import { actionIconNames } from '../../../infra/action-icons.ts';
  import { Icon } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { face, compact = false }: CatalogProps<"face"> = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
</script>
<!-- The face draws its own round mark: its fill and border come from the theme's tm-face utility. -->
<div class="bank-face tm-face relative flex shrink-0 select-none overflow-hidden rounded-[30%] after:pointer-events-none after:absolute after:inset-0 after:rounded-[30%] after:border"
  data-piece="face" data-face-kind={face.kind} data-compact={compact || undefined}
  data-tone={face.kind === "status" ? face.severity : "neutral"} aria-hidden="true">
  <span class="face-content type-body flex size-full items-center justify-center rounded-[inherit]" data-face-content>
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
    .bank-face[data-face-kind="flag"] .face-glyph { font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
    .bank-face[data-tone="warning"] { --face-tone:var(--warning); color:var(--face-tone); }
    .bank-face[data-tone="error"] { --face-tone:var(--destructive); color:var(--face-tone); }
  }
</style>
