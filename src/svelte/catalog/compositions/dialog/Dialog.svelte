<script lang="ts">
  import { Action, Column, Face, Heading, Inline, Modal, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { toolbarAction } from "../../../../interaction/toolbar.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { open, locked, face, title, subtitle, primary, secondary, tone, description, severity, oninvoke, ondismiss, onclosed }:
    CatalogProps<"dialog"> = $props();
  const uid = $props.id();
  const titleId = `${uid}-title`, subtitleId = `${uid}-subtitle`;
  // A problem (the problem node's variant) shows its severity's status face, its description and one Close: a dismissal,
  // unavailable while it is locked.
  let problem = $derived(severity !== undefined);
  let shownFace = $derived(severity !== undefined ? { kind: "status", severity } as const : face);
  let shownSubtitle = $derived(severity !== undefined ? description : subtitle);
  let shownSecondary = $derived(severity !== undefined ? toolbarAction({ kind: "close" }, say(m.dialog.close), "close", !locked) : secondary);
  const dismiss = () => { if (!problem || !locked) ondismiss?.(); };
  const choose = (intent: SurfaceIntent) => { if (problem) { if (intent.kind === "close") dismiss(); } else oninvoke?.(intent); };
</script>

<!-- The visible title names the dialog and the visible subtitle describes it; the face, title and subtitle centre over
     the choices, which keep to the trailing edge. -->
<Modal label={title} labelledBy={titleId} describedBy={shownSubtitle ? subtitleId : undefined} {open} {locked} presentation="message"
  ondismiss={dismiss} {onclosed}>
  <Column gap="close" align="center">
    {#if shownFace}<Face face={shownFace} />{/if}
    <Column gap="tight" align="center">
      <Heading kind="section" id={titleId} text={title} align="center" />
      {#if shownSubtitle}<Text kind="body" tone="muted" id={subtitleId} text={shownSubtitle} align="center" />{/if}
    </Column>
  </Column>
  {#snippet actions()}
    {#if shownSecondary || primary}
      <Inline gap="close" justify="end" overflow="wrap">
        {#if shownSecondary}
          <Action label={shownSecondary.label} icon={shownSecondary.icon} state={shownSecondary.state} reason={shownSecondary.reason}
            emphasis="secondary" face="text" type="button" onclick={() => { if (shownSecondary) choose(shownSecondary.intent); }} />
        {/if}
        {#if primary}
          <Action label={primary.label} icon={primary.icon} state={primary.state} reason={primary.reason}
            emphasis={tone === "destructive" ? "destructive" : "primary"} face="text" type="button" onclick={() => choose(primary.intent)} />
        {/if}
      </Inline>
    {/if}
  {/snippet}
</Modal>
