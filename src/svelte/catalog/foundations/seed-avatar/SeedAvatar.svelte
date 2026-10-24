<script lang="ts">
  import { Avatar } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  // SeedAvatar is Avatar with a seed source; this folder stays until Batch 3 prunes it (its callers move to Avatar).
  let { seed, label = "Identity avatar", size = "portrait" }: CatalogProps<"seed-avatar"> = $props();
</script>
<Avatar source={{ kind: "seed", seed }} {label} {size} interaction="none" />
