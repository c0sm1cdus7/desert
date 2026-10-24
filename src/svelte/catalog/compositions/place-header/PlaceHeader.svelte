<script lang="ts">
  import { Heading } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, subtitle, background }: CatalogProps<"place-header"> = $props();
  let failed = $state(false);
  $effect(() => { background?.asset; failed = false; });
</script>

<!-- An embedded heading is content, never a toolbar or scroll owner. -->
<header class="place-heading" data-embedded-place-heading>
  <div class="flex min-w-0 flex-col gap-1">
    {#if background && !failed}<img src={`/media/${encodeURIComponent(background.asset)}`} alt={background.alt} onerror={() => failed = true} />{/if}
    <Heading kind="page" text={title} />
    <p class="type-support text-muted-foreground" data-place-subtitle>{subtitle}</p>
  </div>
</header>
