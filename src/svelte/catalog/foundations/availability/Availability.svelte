<script lang="ts">
  import { Icon } from "../../index.ts";
  import { Spinner } from "../../../vendor/components/ui/spinner/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { state, label }: CatalogProps<"availability"> = $props();
</script>
<!-- Glyphs are sized by the line itself: a check, a warning or a spinner one rem square, never shrinking beside the sentence. -->
<div class="bank-status [&_svg]:size-4 [&_svg]:shrink-0" role="status" aria-live="polite" data-primitive="availability" data-ready={state === "ready"}>
  <!-- F1-merge: the unknown state mounts Loading (kind spinner) instead of the vendor spinner. -->
  {#if state === "ready"}<Icon name="circle-check" tone="success" decorative />{:else if state === "unknown"}<Spinner aria-hidden="true" />{:else}<Icon name="circle-alert" tone="warning" decorative />{/if}
  <span>{label}</span>
</div>

<style>
  /* Base geometry sits in the components layer, as in theme.css, so contextual rules keep their precedence. */
  @layer components {
    .bank-status { display:flex; align-items:center; gap:.5rem; font-size:var(--text-body); color:var(--muted-foreground); }
  }
</style>
