<script lang="ts">
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { failureFeedback } from "../web/client/failure-feedback.ts";
  let { code, uncertain = false, close }: { code: string | null, uncertain?: boolean, close: () => void } = $props();
  let feedback = $derived(failureFeedback(code, uncertain));
</script>

{#if code}
  <BankRenderer node={{ version: BankVersion, kind: "problem", open: true, title: feedback.title,
    description: feedback.description, locked: false, severity: "error" }} onevent={close} />
{/if}
