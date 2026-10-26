<script lang="ts">
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, Information, StackLayout, ViewRegion } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { nameParts } from "../../../../interaction/name-parts.ts";
  let { id }: CatalogProps<"contract-inspection"> = $props();
  let inspection = $derived(ResolvedNodes.entries.find(entry => entry.id === id)!.inspection);
  let owners = $derived(inspection.owners.map(owner => ResolvedNodes.foundations.find(item => item.id === owner)!.title));
  let contract = $derived([
    { kind: "fact" as const, label: say(m.contractInspection.component), value: id },
    { kind: "fact" as const, label: say(m.contractInspection.sharedOwners), value: owners.join(" · ") },
    ...Object.entries(inspection.axes).filter(([, values]) => values.length)
      .map(([axis, values]) => ({ kind: "fact" as const, label: axis, value: values.join(" · ") })),
    { kind: "fact" as const, label: say(m.contractInspection.qualification),
      value: say(m.contractInspection.fixtures, { count: String(inspection.fixtures.length) }) },
  ]);
</script>

<!-- The kind's contract region, `contract:<id>`. -->
<ViewRegion kind="item" id={`contract:${id}`}>
  <Column gap="section">
    <StackLayout title={say(m.contractInspection.contract)}><Information items={contract} /></StackLayout>
    <!-- A gap's or an evidence path's name (Safari/VoiceOver, tests/extended-controls.test.ts) breaks only between its parts:
         a zero-width space between them draws nothing, so a narrow line never chops one of their words. -->
    <StackLayout title={say(m.contractInspection.coverageGaps)}>
      <Information items={inspection.gaps.map(text => ({ kind: "text" as const, text: nameParts(text, true).join("\u200b") }))} />
    </StackLayout>
    <StackLayout title={say(m.contractInspection.evidence)}>
      <Information items={inspection.evidence.map(text => ({ kind: "text" as const, text: nameParts(text, true).join("\u200b") }))} />
    </StackLayout>
  </Column>
</ViewRegion>
