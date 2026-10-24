<script lang="ts">
  import { Bar, Column, Information, List, PlaceHeading, Row, SharedOwnerSpecimen, StackLayout, ViewRegion } from "../../index.ts";
  import { CatalogSources } from "../../sources.ts";
  import { sharedOwnerPieces } from "../../../infra/shared-owners.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { sharedPurpose, sharedParts } from '../../../infra/shared-purpose.ts';
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { selected, hosted, onselect }: CatalogProps<"shared-owner-catalog">=$props();
  const catalogFace = { kind: "face", face: { kind: "icon", icon: "catalog" } } as const;
</script>

<!-- The region stays mounted (empty) while no owner is shown, so the bank's column keeps its rhythm. -->
<ViewRegion kind="item" id="shared-owner-catalog">
  {#if selected}
    <Column gap="section">
      {#if !hosted}
        <Bar edge="top" purpose="commands" identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false}
          leading={{ label: say(m.sharedOwnerCatalog.back), icon: "back", state: "ready", intent: { kind: "back" } }}
          oninvoke={() => onselect?.(null)} />
        <PlaceHeading context="embedded" title={sharedPurpose[selected].title} subtitle={sharedPurpose[selected].purpose} />
      {/if}
      <StackLayout title={say(m.sharedOwnerCatalog.example)}><SharedOwnerSpecimen owner={selected} /></StackLayout>
      {#if sharedParts(selected).length}
        <StackLayout title={say(m.sharedOwnerCatalog.parts)}><List kind="rows" measure="reading">
          {#each sharedParts(selected) as id (id)}
            <Row label={sharedPurpose[id].title} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
              focusKey={id} onopen={() => onselect?.(id)} />
          {/each}
        </List></StackLayout>
      {/if}
      <StackLayout title={say(m.sharedOwnerCatalog.contract)}><Information items={[
        { kind: "fact", label: say(m.sharedOwnerCatalog.owner), value: selected },
        { kind: "fact", label: say(m.sharedOwnerCatalog.source), value: CatalogSources[sharedOwnerPieces[selected]] },
      ]} /></StackLayout>
    </Column>
  {/if}
</ViewRegion>
