<script lang="ts">
  import type { AttentionSnapshot } from "../../../../web/client/attention-feed.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import AttentionList from "../attention-list/AttentionList.svelte";
  let { state, onevent }: { state: AttentionSnapshot; onevent: (event: NodeEvent) => void } = $props();
</script>
<AttentionList {state} resume={id => onevent({ kind: "attention.resume", id })} />
