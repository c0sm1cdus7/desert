<script lang="ts">
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import { Description } from "../../../vendor/components/ui/dialog/index.js";
  let { content, messageDialog = false }: { content: Extract<FrameContent, { kind: "message" }>; messageDialog?: boolean } = $props();
</script>
{#if messageDialog}
  <Description presentation="message" class="message-description">{content.text}</Description>
{:else}
  <p class="type-body text-start" role="status">{content.text}</p>
{/if}
