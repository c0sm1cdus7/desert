<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Information, TextContent, ViewBinding, ViewDestinationLink } from "../../index.ts";
  let { item, resolved, onevent, host = "flow" }: CatalogProps<"view-item"> = $props();
</script>

{#if item.kind === "text"}
  <TextContent text={item.text} />
{:else if item.kind === "fact"}
  <Information items={[item]} />
{:else if item.kind === "destination-link"}
  <ViewDestinationLink view={resolved.view.id} output={item.output} label={item.label} icon={item.icon}
    reason={resolved.disabledOutputs.includes(item.output) ? resolved.connection?.label : undefined}
    available={!resolved.disabledOutputs.includes(item.output)} {onevent} />
{:else if item.kind === "tag" || item.kind === "image" || item.kind === "avatar" || item.kind === "collection" || item.kind === "form" || item.kind === "context"}
  <ViewBinding {item} {resolved} {onevent} {host} />
{/if}
