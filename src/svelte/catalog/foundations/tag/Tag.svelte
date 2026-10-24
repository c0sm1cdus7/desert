<script lang="ts">
  import { Badge } from "../../../vendor/components/ui/badge/index.js";
  import { ColorBullet } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import TagRemove from "./TagRemove.svelte";
  let { label, disabled, state, color, presentation, tone, removable, removeLabel, onremove }: CatalogProps<"tag"> = $props();
  // The badge variant of each tone: a neutral tag is the secondary badge.
  const variants = { neutral: "secondary", accent: "accent", success: "success", warning: "warning", destructive: "destructive" } as const;
  function chipVariant(value: typeof tone) {
    if (value === undefined) throw new Error("TAG_CONTRACT: a chip carries a tone; contract: tag");
    return variants[value];
  }
</script>

{#if presentation === "chip"}
  <Badge variant={chipVariant(tone)} {removable} data-tag={state} data-tone={tone}>
    {#if color}<ColorBullet {color} />{/if}<span>{label}</span>
    {#if removable}<TagRemove label={removeLabel} {disabled} {onremove} />{/if}
  </Badge>
{:else}
  <span class="reference-value" data-tag={state}>{#if color}<ColorBullet {color} />{/if}{label}</span>
{/if}

<style>
  .reference-value { display:inline-flex; align-items:baseline; gap:.4em; min-width:0; overflow-wrap:anywhere; text-wrap:balance; }
</style>
