<script lang="ts">
  import type { AttentionSnapshot } from "../../web/client/attention-feed.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import AttentionList from "../pieces/AttentionList.svelte";
  let { state, onevent }: { state: AttentionSnapshot; onevent: (event: BankEvent) => void } = $props();
</script>
<AttentionList {state} resume={id => onevent({ kind: "attention.resume", id })} />
