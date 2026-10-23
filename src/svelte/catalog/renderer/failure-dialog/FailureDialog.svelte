<script lang="ts">
  import { NodeRenderer } from "../../../adapter-catalog.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { failureFeedback } from "../../../../web/client/failure-feedback.ts";
  let { code, uncertain = false, close }: { code: string | null, uncertain?: boolean, close: () => void } = $props();
  let feedback = $derived(failureFeedback(code, uncertain));
</script>

{#if code}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "problem", open: true, title: feedback.title,
    description: feedback.description, locked: false, severity: "error" }} onevent={close} />
{/if}
