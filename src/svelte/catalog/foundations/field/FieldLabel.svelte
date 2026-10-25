<script lang="ts">
  // The persistent label of a Field's well above its editor or value: a real <label> when it names an editor, plain text
  // inside a trigger (the button owns its text; no nested label activation). `accessible` keeps it for assistive
  // technology only.
  import type { Snippet } from "svelte";
  import * as Vendor from "../../../vendor/components/ui/field/index.js";
  let { for: editor, label, labelVisibility, required, children }: {
    for: string | undefined; label: string; labelVisibility: "visible" | "accessible"; required: boolean; children: Snippet;
  } = $props();
</script>
<span class="relative flex min-w-0 flex-1 flex-col" data-field-well>
  {#if editor}
    <!-- The theme draws the required mark after the label (the required-mark utility). -->
    <Vendor.FieldLabel for={editor} class={[labelVisibility === "accessible" && "sr-only", required && "required-mark"]}>{label}</Vendor.FieldLabel>
  {:else}
    <span data-slot="field-label" class={[labelVisibility === "accessible" && "sr-only", required && "required-mark"]}>{label}</span>
  {/if}
  {@render children()}
</span>
