<script lang="ts">
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { failureFeedback } from "../../../../web/client/failure-feedback.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { code, uncertain = false, close }: CatalogProps<"failure-dialog"> = $props();
  let feedback = $derived(failureFeedback(code, uncertain));
</script>

{#if code}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "problem", open: true, title: feedback.title,
    description: feedback.description, locked: false, severity: "error" }} onevent={close} />
{/if}
