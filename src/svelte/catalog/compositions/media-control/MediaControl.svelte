<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Avatar, Column, Gallery, Inline, Status, Tag, Text } from "../../index.ts";
  import { imageIdentity } from "../../../infra/media-source.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node }: CatalogProps<"media-control"> = $props();
  // A named library asset is served from its media path; a public path or a private asset is shown as it is.
  let source = $derived(node.kind === "tag" || node.source === null ? null
    : typeof node.source === "object" && "asset" in node.source ? `/media/${encodeURIComponent(node.source.asset)}` : node.source);
</script>

{#if node.kind === "tag"}
  <Tag presentation="chip" tone={node.tone} label={node.label} state="known" removable={false} disabled={node.disabled} />
{:else if node.kind === "avatar"}
  <Inline gap="close" overflow="none">
    <Avatar size="row" interaction="none" source={source ? { kind: "image", source, initials: node.fallback } : { kind: "initials", initials: node.fallback }} />
    <Text kind="body" text={node.label} wrap="anywhere" />
  </Inline>
{:else}
  <Column gap="snug">
    {#if source}
      {#key imageIdentity(source)}<Gallery photos={[{ source, alt: node.alt }]} title={node.label} presentation="inline" fit="fill" aspect={node.aspect} />{/key}
    {:else}<Status icon="image-off" title={say(m.mediaControl.unavailable)} tone="neutral" size="regular" heading={false} />{/if}
    <Text kind="body" text={node.label} />
  </Column>
{/if}
