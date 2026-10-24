<script lang="ts">
  import { Description } from "../../../vendor/components/ui/dialog/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { content, messageDialog = false }: CatalogProps<"message-body"> = $props();
</script>
{#if messageDialog}
  <Description presentation="message" class="message-description">{content.text}</Description>
{:else}
  <p class="type-body text-start" role="status">{content.text}</p>
{/if}
