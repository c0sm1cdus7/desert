<script lang="ts">
  import { Action, Column, Face, Heading, Inline, Modal, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { open, locked, face, title, subtitle, primary, secondary, tone, oninvoke, ondismiss, onclosed }: CatalogProps<"dialog"> = $props();
  const uid = $props.id();
  const titleId = `${uid}-title`, subtitleId = `${uid}-subtitle`;
</script>

<!-- The visible title names the dialog and the visible subtitle describes it; the face, title and subtitle centre over
     the choices, which keep to the trailing edge. -->
<Modal label={title} labelledBy={titleId} describedBy={subtitle ? subtitleId : undefined} {open} {locked} presentation="message"
  ondismiss={() => ondismiss?.()} {onclosed}>
  <Column gap="close" align="center">
    {#if face}<Face {face} />{/if}
    <Column gap="tight" align="center">
      <Heading kind="section" id={titleId} text={title} align="center" />
      {#if subtitle}<Text kind="body" tone="muted" id={subtitleId} text={subtitle} align="center" />{/if}
    </Column>
  </Column>
  {#snippet actions()}
    {#if secondary || primary}
      <Inline gap="close" justify="end" overflow="wrap">
        {#if secondary}
          <Action label={secondary.label} icon={secondary.icon} state={secondary.state} reason={secondary.reason} emphasis="secondary"
            face="text" type="button" onclick={() => oninvoke?.(secondary.intent)} />
        {/if}
        {#if primary}
          <Action label={primary.label} icon={primary.icon} state={primary.state} reason={primary.reason}
            emphasis={tone === "destructive" ? "destructive" : "primary"} face="text" type="button" onclick={() => oninvoke?.(primary.intent)} />
        {/if}
      </Inline>
    {/if}
  {/snippet}
</Modal>
