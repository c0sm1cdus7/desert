<script lang="ts">
  import * as Empty from "../vendor/components/ui/empty/index.js";
  import { Spinner } from "../vendor/components/ui/spinner/index.js";
  import FileText from "@lucide/svelte/icons/file-text";
  let { loaded, createLabel }: { loaded: boolean; createLabel: string } = $props();
</script>
<Empty.Root role="group" aria-label="Collection state" data-collection-state={loaded ? "empty" : "unread"}>
  <Empty.Header>
    <Empty.Media variant="icon">{#if loaded}<FileText aria-hidden="true" />{:else}<Spinner aria-hidden="true" />{/if}</Empty.Media>
    <Empty.Title role="heading" aria-level={2}>{loaded ? "Nothing here yet." : "Waiting for your records."}</Empty.Title>
    <Empty.Description>{loaded ? `Use “${createLabel}” to get started.` :
      "Nothing has been loaded yet. This does not mean the collection is empty."}</Empty.Description>
  </Empty.Header>
</Empty.Root>
