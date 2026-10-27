<script lang="ts">
  import { Bar, Column, Face, Heading, Modal, Text } from "../../index.ts";
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
  // unavailable while it is locked. Either way the dialog has a face, a title, a subtitle and its choices, nothing else.
  let problem = $derived(severity !== undefined);
  let shownFace = $derived(severity !== undefined ? { kind: "status", severity } as const : face);
  let shownSubtitle = $derived(severity !== undefined ? description : subtitle);
  let shownSecondary = $derived(severity !== undefined ? toolbarAction({ kind: "close" }, say(m.dialog.close), "close", !locked) : secondary);
  const dismiss = () => { if (!problem || !locked) ondismiss?.(); };
  const choose = (intent: SurfaceIntent) => { if (problem) { if (intent.kind === "close") dismiss(); } else oninvoke?.(intent); };
</script>

<!-- The visible title names the dialog and the visible subtitle describes it; the face, title and subtitle centre over
     the choices: Bar's commit pair, the same 50/50 text pair as an action's bottom toolbar. -->
<Modal label={title} labelledBy={titleId} describedBy={subtitleId} {open} {locked} presentation="message"
  ondismiss={dismiss} {onclosed}>
  <Column gap="close" align="center">
    {#if shownFace}<Face face={shownFace} />{/if}
    <Column gap="tight" align="center">
      <Heading kind="section" id={titleId} text={title} align="center" />
      <!-- Both variants require it (the contract); the guard only narrows the destructured union for the type checker. -->
      {#if shownSubtitle}<Text kind="body" tone="muted" id={subtitleId} text={shownSubtitle} align="center" />{/if}
    </Column>
  </Column>
  {#snippet actions()}
    <Bar edge="bottom" purpose="commit" identityRole="message" trailing={[]} secondary={shownSecondary} {primary}
      tone={tone === "destructive" ? "destructive" : "standard"} settingsPlaceholder={false} inert={false} oninvoke={choose} />
  {/snippet}
</Modal>
