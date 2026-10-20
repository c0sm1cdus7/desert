<script lang="ts">
  import type { Snippet } from "svelte";
  import Heading from "./Heading.svelte";
  let { title, subtitle, actions, search, background }: {
    title: string; subtitle: string; actions?: Snippet; search?: Snippet;
    background?: { asset: string; alt: string };
  } = $props();
  let failed = $state(false);
  $effect(() => { background?.asset; failed = false; });
</script>

<!-- An embedded heading is content, never a toolbar or scroll owner. -->
<header class="place-heading" data-embedded-place-heading>
  <div class="flex min-w-0 flex-col gap-2">
    {#if background && !failed}<img src={`/media/${encodeURIComponent(background.asset)}`} alt={background.alt} onerror={() => failed = true} />{/if}
    <Heading class="type-page" data-place-title>{title}</Heading>
    <p class="type-support text-muted-foreground" data-place-subtitle>{subtitle}</p>
  </div>
  {@render search?.()}{@render actions?.()}
</header>
