<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { required, placement = 'inline' }: CatalogProps<"attention-indicator"> = $props();
</script>
{#if required}<span class="attention-indicator" class:attention-overlay={placement === "overlay"} data-attention-indicator
  data-attention-placement={placement} role="img" aria-label={say(m.attentionIndicator.label)}></span>{/if}
<style>
  .attention-indicator { display:inline-block; flex:0 0 auto; width:8px; height:8px; border-radius:var(--radius-mark); background:var(--warning); box-shadow:0 0 0 3px color-mix(in srgb,var(--warning) 14%,transparent); animation:attention-pulse 1.8s ease-in-out infinite; }
  .attention-overlay { position:absolute; top:var(--well-padding,16px); right:var(--well-padding,16px); z-index:2; }
  @keyframes attention-pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
  @media(prefers-reduced-motion:reduce) { .attention-indicator { animation:none; } }
</style>
