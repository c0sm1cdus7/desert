<script lang="ts">
  // Bar part (from the toolbar-layout composition's ToolbarIdentity): the title and subtitle a bar shows. A continuation
  // echoes a heading that scrolled away, so it is hidden from assistive technology and drawn as plain text.
  let { title, subtitle, role }: {
    title: string; subtitle: string | undefined; role: "heading" | "continuation" | "dialog" | "message";
  } = $props();
  let continuation = $derived(role === "continuation");
</script>

<div class="toolbar-heading" data-toolbar-heading data-toolbar-identity={continuation || undefined} aria-hidden={continuation || undefined}>
  {#if continuation}
    <span class="toolbar-title type-section truncate" data-toolbar-title data-identity-title>{title}</span>
  {:else if role === "dialog" || role === "message"}
    <!-- F1-merge: modal names its dialog by `label` (F1d); the bar title is no longer the bits Dialog.Title. -->
    <h2 class="type-section toolbar-title" data-toolbar-title>{title}</h2>
  {:else}
    <h2 class="toolbar-title type-section" data-toolbar-title {title}>{title}</h2>
  {/if}
  {#if subtitle}
    <p class="toolbar-subtitle type-support" data-toolbar-subtitle data-identity-subtitle={continuation || undefined} title={subtitle}>{subtitle}</p>
  {/if}
</div>
