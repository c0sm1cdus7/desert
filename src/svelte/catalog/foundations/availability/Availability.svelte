<script lang="ts">
  import { Icon, Loading } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { state, label, compact }: CatalogProps<"availability"> = $props();
</script>
<!-- Glyphs are sized by the line itself: a check, a warning or a spinner one rem square, never shrinking beside the sentence. -->
<div class="bank-status [&_svg]:size-4 [&_svg]:shrink-0" role="status" aria-live="polite" data-primitive="availability" data-ready={state === "ready"} data-compact={compact || undefined}>
  {#if state === "ready"}<Icon name="circle-check" tone="success" decorative />{:else if state === "unknown"}<Loading kind="spinner" {label} />{:else}<Icon name="circle-alert" tone="warning" decorative />{/if}
  <span class="label">{label}</span>
</div>

<style>
  /* Base geometry sits in the components layer, as in theme.css, so contextual rules keep their precedence. */
  @layer components {
    .bank-status { display:flex; align-items:center; gap:.5rem; font-size:var(--text-body); color:var(--muted-foreground); }
  }
  @media (max-height:640px) {
    [data-compact] > .label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  }
</style>
