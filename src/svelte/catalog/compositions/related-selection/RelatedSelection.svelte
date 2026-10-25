<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Action, Choice, Information, List, StackLayout, Text } from "../../index.ts";
  import type { RelatedSelectionGroup, RelatedSelectionItem } from "../../../../interaction/related-selection.ts";
  import type { ChoiceLeading } from "../../../../interaction/choice.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { state, onevent }: CatalogProps<"related-selection"> = $props();
  const unavailable = (group: RelatedSelectionGroup) => Boolean(group.disabled || state.busy || state.uncertain || state.committing || group.loading);
  /** A related item leads with its picture, or with the artwork of its media kind. */
  function leading(item: RelatedSelectionItem): ChoiceLeading | undefined {
    if (!item.asset) return undefined;
    if (item.asset.media === "video" || item.asset.media === "audio") return { kind: "artwork", media: item.asset.media };
    return { kind: "image", source: item.asset, alt: item.label };
  }
  /** The rows report the whole next selection; the owner hears the one item that changed. */
  function change(group: RelatedSelectionGroup, selected: readonly string[]) {
    const item = group.items.find(candidate => candidate.checked !== selected.includes(candidate.id));
    if (item) onevent?.({ kind: "related.change", input: group.input, id: item.id, checked: !item.checked });
  }
</script>
{#each state.groups as group (group.input)}
  <StackLayout title={group.label}>
    {#if group.items.length}
      <Choice presentation="rows" cardinality="many" label={group.label} labelVisibility="accessible"
        selected={group.items.filter(item => item.checked).map(item => item.id)} disabled={unavailable(group)} required={false}
        onchange={selected => change(group, selected)} options={group.items.map(item => {
          const lead = leading(item);
          return { value: item.id, label: item.label, disabled: false, ...lead ? { leading: lead } : {} };
        })} />
    {:else if group.loading}<Information items={[{ kind: "text", text: say(m.relatedSelection.loading) }]} />
    {:else if !group.error}<List kind="rows" measure="reading"><Text kind="body" inset="row" text={say(m.relatedSelection.empty)} /></List>{/if}
    {#if group.error}<Text kind="support" live="polite" text={group.error} />
      <Action label={group.uncertain ? say(m.relatedSelection.check) : say(m.relatedSelection.retry)} icon="retry" emphasis="secondary" face="text"
        type="button" state={group.disabled || state.busy ? "unavailable" : "ready"} onclick={() => onevent?.({ kind: "related.recover", input: group.input })} />
    {/if}
  </StackLayout>
{/each}
