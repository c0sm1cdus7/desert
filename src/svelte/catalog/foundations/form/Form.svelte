<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { label, submit, children }: CatalogProps<"form"> = $props();
</script>
<form aria-label={label} class="grid w-full gap-4 text-left" onsubmit={event => { event.preventDefault(); submit(); }}>{@render children?.()}</form>
