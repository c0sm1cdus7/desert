<script lang="ts">
  import { Title } from "../../../vendor/components/ui/dialog/index.js";
  import type { ToolbarIdentityContent, ToolbarIdentityRole } from "./toolbar-identity.ts";
  let { identity, identityRole: role = "heading", onelement }: {
    identity: ToolbarIdentityContent; identityRole?: ToolbarIdentityRole; onelement?: (element: HTMLDivElement | null) => void;
  } = $props();
  let element = $state<HTMLDivElement | null>(null);
  $effect(() => { onelement?.(element); return () => onelement?.(null); });
</script>

<div bind:this={element} class="toolbar-heading" data-toolbar-heading
  data-toolbar-identity={role === "continuation" || undefined} aria-hidden={role === "continuation" || undefined}>
  {#if role === "continuation"}
    <span class="toolbar-title type-section truncate" data-toolbar-title data-identity-title>{identity.title}</span>
  {:else if role === "dialog" || role === "message"}
    <Title presentation="toolbar">{identity.title}</Title>
  {:else}
    <h2 class="toolbar-title type-section" data-toolbar-title title={identity.title}>{identity.title}</h2>
  {/if}
  {#if identity.subtitle}
    <p class="toolbar-subtitle type-support" data-toolbar-subtitle
      data-identity-subtitle={role === "continuation" || undefined} title={identity.subtitle}>{identity.subtitle}</p>
  {/if}
</div>
