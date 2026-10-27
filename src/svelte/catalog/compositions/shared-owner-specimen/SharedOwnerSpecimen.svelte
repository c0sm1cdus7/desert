<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { AccessAppearanceSpecimen, Action, AttentionIndicator, AttentionList, AttentionStatus, Avatar, Bar, Choice, Collection,
    Column, ContentFlow, ContextProperties, Dialog, Information, List, MediaReferenceSpecimen, Menu, ObjectStateControl,
    ObjectStateRow, ReadingContent, ReferenceSpecimen, RelatedSelection, Row, StackLayout, SummaryWidget,
    SurfaceSpecimen, Text, ThemePreview, ViewDestinationLink, ViewRegion } from "../../index.ts";
  import { confirmationDialog } from "../../../infra/confirmation-dialog.ts";
  import { defaultAppearance } from "../../../infra/appearance-preferences.ts";
  import * as fixture from "./shared-owner-fixtures.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { owner }: CatalogProps<"shared-owner-specimen"> = $props();
  let open = $state(false), feedback = $state(say(m.sharedOwnerSpecimen.initial));
  let status = $state("open"), seed = $state("0011223344556677");
  let flowLayout = $state<"overview" | "gallery">("overview");
  let commandState = $state("ready"), widgetState = $state("ready");
  let commandReason = $derived(commandState === "loading" ? say(m.sharedOwnerSpecimen.connecting)
    : commandState === "offline" ? say(m.sharedOwnerSpecimen.reconnect) : undefined);
  let relation = $state(fixture.relation);
  const connection = [
    { value: "ready", label: say(m.sharedOwnerSpecimen.ready), disabled: false },
    { value: "loading", label: say(m.sharedOwnerSpecimen.loading), disabled: false },
    { value: "offline", label: say(m.sharedOwnerSpecimen.offline), disabled: false },
  ];
  const layouts = [
    { value: "overview", label: say(m.sharedOwnerSpecimen.overview), disabled: false },
    { value: "gallery", label: say(m.sharedOwnerSpecimen.gallery), disabled: false },
  ];
  const catalogFace = { kind: "face", face: { kind: "icon", icon: "catalog" } } as const;
  const check = (id: string, checked: boolean) => {
    relation = { ...relation, groups: relation.groups.map(group => ({ ...group,
      items: group.items.map(item => item.id === id ? { ...item, checked } : item) })) };
  };
</script>

<!-- The owner's region, `owner:<name>`: one shared owner's live example and the notice of what it did. An unframed example
     (an avatar, a tag rail, a color bullet, an indicator) reads on the row inset its stack's titles and text read at; a
     framed one (a field, a list, a card) keeps its frame on the stack's edge. -->
<ViewRegion kind="item" id={`owner:${owner}`}>
  <Column gap="regular">
    {#if owner === "Place"}<SurfaceSpecimen />
    {:else if owner === "Flow"}
      <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.sharedOwnerSpecimen.layout)} labelVisibility="visible"
        options={layouts} selected={[flowLayout]} disabled={false} required={false}
        onchange={next => { if (next[0] === "overview" || next[0] === "gallery") flowLayout = next[0]; }} />
      {#if flowLayout === "gallery"}<ContentFlow resolved={fixture.gallery} onevent={() => feedback = say(m.sharedOwnerSpecimen.openMedia)} />
      {:else}<ContentFlow resolved={fixture.overview} onevent={event => feedback = event.kind === "attention.resume"
        ? say(m.sharedOwnerSpecimen.resume) : say(m.sharedOwnerSpecimen.openTasks)} />{/if}
    {:else if owner === "SummaryWidget"}
      <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.sharedOwnerSpecimen.state)} labelVisibility="visible"
        options={connection} selected={[widgetState]} disabled={false} required={false} onchange={next => widgetState = next[0] ?? widgetState} />
      <SummaryWidget node={fixture.widgetIn(widgetState)} activate={() => feedback = say(m.sharedOwnerSpecimen.openTasks)} />
    {:else if owner === "RelatedSelection"}
      <RelatedSelection state={relation} onevent={event => { if (event.kind === "related.change") check(event.id, event.checked); }} />
    {:else if owner === "MediaReferenceSelector"}<MediaReferenceSpecimen />
    {:else if owner === "LabelRail" || owner === "ColorBullet" || owner === "ReferenceValues"}
      <Column gap="regular" align="start" inset="row"><ReferenceSpecimen {owner} /></Column>
    {:else if owner === "ReferenceSelector" || owner === "LabelsControl"}<ReferenceSpecimen {owner} />
    {:else if owner === "AttentionList"}
      <AttentionList state={fixture.attention} resume={id => feedback = say(m.sharedOwnerSpecimen.resumeActivity, { id })} />
    {:else if owner === "AttentionStatus"}<AttentionStatus signals={[fixture.attentionSignal]} />
    {:else if owner === "ObjectStateControl"}
      <ObjectStateControl selectors={[fixture.statusSelector(status)]} onselect={value => status = value} />
    {:else if owner === "ContextProperties"}
      <ContextProperties fields={['projects']} facts={{ projects: ['design', 'research'] }} object="task" labels={{ 'task.projects': 'Projects' }}
        references={{ projects: [{ value: 'design', label: 'Design', color: 'violet' }, { value: 'research', label: 'Research', color: 'green' }] }}
        selectors={[fixture.statusSelector(status)]} onselect={value => status = value} />
    {:else if owner === "ObjectStateRow"}
      <List kind="facts" measure="reading"><ObjectStateRow selector={fixture.statusSelector(status)} onselect={value => status = value} /></List>
    {:else if owner === "AttentionIndicator"}
      <Column gap="regular" align="start" inset="row"><AttentionIndicator required /></Column>
      <Information items={[{ kind: "text", text: say(m.sharedOwnerSpecimen.attention) }]} />
    {:else if owner === "AppearancePreview"}<ThemePreview mode="dark" tint={defaultAppearance.tint} wallpaper={defaultAppearance.wallpaper} />
    {:else if owner === "AvatarShuffle"}
      <Column gap="regular" align="start" inset="row"><Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed }}
        shuffleLabel={say(m.sharedOwnerSpecimen.shuffle)} onshuffle={next => seed = next} /></Column>
    {:else if owner === "SeedAvatar"}<Column gap="regular" align="start" inset="row"><AccessAppearanceSpecimen {owner} /></Column>
    {:else if owner === "AppearancePreferences" || owner === "Wallpaper" || owner === "AccessExperience" || owner === "LockScreen"}
      <AccessAppearanceSpecimen {owner} />
    {:else if owner === "ViewDestinationLink"}
      <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.sharedOwnerSpecimen.state)} labelVisibility="visible"
        options={connection} selected={[commandState]} disabled={false} required={false} onchange={next => commandState = next[0] ?? commandState} />
      <StackLayout title={say(m.sharedOwnerSpecimen.objects)}>
        <Collection node={fixture.notes} select={() => feedback = say(m.sharedOwnerSpecimen.openObject)} />
      </StackLayout>
      <StackLayout title={say(m.sharedOwnerSpecimen.actions)}>
        <ViewDestinationLink view="notes" output="trash" label="Trash" icon="archive" available={commandState === 'ready'} reason={commandReason}
          onevent={() => feedback = say(m.sharedOwnerSpecimen.openTrash)} />
        {#if commandReason}<Text kind="support" live="polite" text={commandReason} />{/if}
      </StackLayout>
    {:else if owner === "ConfirmationDialog"}
      <Action label={say(m.sharedOwnerSpecimen.moveToTrash)} icon="archive" state="ready" emphasis="secondary" face="text" type="button"
        onclick={() => open = true} />
      {#if fixture.confirmation.kind === "confirmation"}
        {@const ask = confirmationDialog(fixture.confirmation)}
        <Dialog {open} locked={false} tone="standard" title={ask.title} subtitle={ask.subtitle} face={ask.face} primary={ask.primary}
          secondary={ask.secondary} oninvoke={intent => { feedback = intent.kind === "accept" ? say(m.sharedOwnerSpecimen.confirmed)
            : say(m.sharedOwnerSpecimen.cancelled); open = false; }}
          ondismiss={() => { feedback = say(m.sharedOwnerSpecimen.cancelled); open = false; }} />
      {/if}
    {:else if owner === "ToolbarLayout"}
      <!-- The example bar stays in the page's reading measure, its commands ending where the page's lists end. -->
      <Column gap="regular" measure="reading"><Bar edge="top" purpose="commands" identity={{ title: "Notes", subtitle: "Your private notes." }} identityRole="heading"
        leading={{ label: say(m.sharedOwnerSpecimen.back), icon: "back", state: "ready", intent: { kind: "back" } }} trailing={fixture.actions}
        settingsPlaceholder={false} inert={false} oninvoke={intent => feedback = intent.kind === "back"
          ? say(m.sharedOwnerSpecimen.back) : say(m.sharedOwnerSpecimen.commandActivated)} /></Column>
    {:else if owner === "SpeedDial"}
      <Menu label={say(m.sharedOwnerSpecimen.moreActions)} icon="more" actions={fixture.actions} {open} align="end"
        onopenchange={value => open = value} oninvoke={() => feedback = say(m.sharedOwnerSpecimen.commandActivated)} />
    {:else if owner === "ReadingContent"}
      <ReadingContent fields={["content"]} facts={{ content: "Reading content remains a readable paragraph, separate from right-aligned properties." }}
        object="note" labels={{ "note.content": "Content" }} />
    {:else if owner === "InspectionCatalog"}
      <StackLayout title={say(m.sharedOwnerSpecimen.foundations)}><List kind="rows" measure="reading">
        <Row label={say(m.sharedOwnerSpecimen.fact)} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
          onopen={() => feedback = say(m.sharedOwnerSpecimen.openFact)} />
        <Row label={say(m.sharedOwnerSpecimen.button)} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
          onopen={() => feedback = say(m.sharedOwnerSpecimen.openButton)} />
      </List></StackLayout>
    {:else}
      <Information items={[
        { kind: "fact", label: "Display name", value: "Franco" },
        { kind: "fact", label: "Identity", value: "franco" },
        { kind: "fact", label: "Role", value: "Administrator with a long value that wraps within its right-aligned column" },
        { kind: "fact", label: "Known empty", value: "" },
        { kind: "fact", label: "Unknown", value: null },
      ]} />
    {/if}
    <StackLayout title={say(m.sharedOwnerSpecimen.interaction)}><Information items={[{ kind: "text", text: feedback }]} /></StackLayout>
  </Column>
</ViewRegion>
