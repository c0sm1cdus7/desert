<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // A Field that opens a surface instead of taking text: its well is one button showing the label and the display (a
  // value or its placeholder, the chosen tags, an image with its text). Press, ArrowDown and ArrowUp ask to open; the
  // overlay that owns the surface passes the disclosure, so the button carries its id and expanded state as data.
  // A select's well (a choice menu's) fits its value, shows press feedback and shows the value its owner draws (`shown`).
  import type { Snippet } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { cn } from "../../../vendor/utils.js";
  import { pressFeedbackProps } from "../../mechanisms/press-feedback/press-feedback.ts";
  import { ColorBullet, Icon, Image } from "../../index.ts";
  import FieldLabel from "./FieldLabel.svelte";
  let { label, labelVisibility, required, disabled, describedBy, display, disclosure, select, shown, onopen }: {
    label: string; labelVisibility: "visible" | "accessible"; required: boolean; disabled: boolean;
    describedBy: string | undefined; display: NonNullable<CatalogProps<"field">["display"]>; disclosure: NonNullable<CatalogProps<"field">["disclosure"]>;
    select: boolean; shown: Snippet | undefined; onopen: () => void;
  } = $props();
  let spoken = $derived(display.kind === "tags" ? display.tags.map(tag => tag.label).join(", ") || say(m.field.none) : display.text);
  function keydown(event: KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    onopen();
  }
  const well = "material-pane control-feedback field-well inline-flex w-full min-h-11 min-w-0 items-center justify-start overflow-hidden rounded-[var(--radius)] p-0 text-left whitespace-normal type-control font-normal text-foreground outline-none disabled:pointer-events-none";
  // The select well keeps the selection well's look: a fit-width pane, at most its slot's width, its content in one row.
  const selectWell = cn("inline-flex shrink-0 items-center whitespace-nowrap type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "text-foreground text-left whitespace-normal w-full font-normal p-0 material-pane control-feedback field-well overflow-hidden",
    "max-w-full min-w-0 whitespace-normal text-balance h-auto w-fit justify-between gap-3 rounded-[var(--radius)]");
</script>
<button {...select ? pressFeedbackProps : {}} type="button" id={disclosure.id} {disabled} onclick={onopen} onkeydown={keydown}
  class={select ? selectWell : well}
  data-floating-field data-filled data-field-trigger data-selection-trigger={select || undefined} aria-label={`${label} · ${spoken}`}
  aria-haspopup={disclosure.haspopup} aria-expanded={disclosure.expanded} aria-controls={disclosure.expanded ? disclosure.controls : undefined}
  data-state={disclosure.expanded ? "open" : "closed"} aria-describedby={describedBy}>
  <span data-button-content class={select ? "select-content control-feedback-content disabled-content" : "disabled-content flex w-full min-w-0 items-center"}>
    <FieldLabel for={undefined} {label} {labelVisibility} {required}>
      <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
        {#if select && shown}{@render shown()}
        {:else if display.kind === "tags"}
          <span class="field-tags">
            {#each display.tags as tag, index (index)}
              <span class="field-tag" data-tag-state={tag.state}>{#if tag.color}<ColorBullet color={tag.color} />{/if}{tag.label}</span>
            {:else}<span class="field-placeholder">{say(m.field.none)}</span>{/each}
          </span>
        {:else if display.kind === "image"}
          <span class="field-image"><span data-field-thumbnail><Image source={display.source} alt="" fit="fill" edge={88} /></span>{display.text}</span>
        {:else}<span class={display.placeholder ? "field-placeholder" : undefined}>{display.text}</span>{/if}
        <Icon name="chevron-down" placement="inline-end" chevron decorative />
      </span>
    </FieldLabel>
  </span>
</button>

<style>
  /* A select well lays out its own content in one row, as the button it replaces did. */
  .select-content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
</style>
