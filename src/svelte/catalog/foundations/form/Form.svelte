<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { label, submit, fill, id, children }: CatalogProps<"form"> = $props();
</script>
<form {id} aria-label={label} class={fill ? "flex min-h-0 flex-1 flex-col" : "grid w-full gap-4 text-left"}
  onsubmit={event => { event.preventDefault(); submit(); }}>{@render children?.()}</form>
