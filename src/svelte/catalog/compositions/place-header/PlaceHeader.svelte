<script lang="ts">
  // The transitional adapter of the piece moved into place-heading (DESIGN §4, item 68): its only caller, place-content,
  // mounts PlaceHeading itself; Batch 3 deletes this folder.
  import { PlaceHeading } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, subtitle, background }: CatalogProps<"place-header"> = $props();
</script>

<PlaceHeading context="embedded" {title} {subtitle} {background} />
