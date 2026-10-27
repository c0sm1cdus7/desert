<script lang="ts">
  import * as Empty from "../../../vendor/components/ui/empty/index.js";
  import { Icon } from "../../index.ts";
  import { rendererLocale } from "../../../../messages/renderer-locale.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, description, icon, tone, size, heading, label }: CatalogProps<"status"> = $props();
  const roles = { neutral: undefined, offline: "status", note: "note" } as const;
  // A prompt (a search before its query) sets its title in the page role over a 32px muted glyph, at a wider measure.
  let prompt = $derived(size === "prompt");
  // A block's sentences are the message bundle's: it names that language (lang), the one a narrow block hyphenates by.
</script>

{#if size === "regular" || size === "prompt"}
  <Empty.Root role={roles[tone]} aria-label={label} data-status={tone} lang={rendererLocale} class={prompt ? "px-0 py-6" : undefined}>
    <Empty.Header class={prompt ? "max-w-[32rem] gap-3" : undefined}>
      {#if icon}<Empty.Media class={prompt ? "text-muted-foreground [&_svg]:size-8" : undefined}><Icon name={icon} decorative /></Empty.Media>{/if}
      <Empty.Title role={heading ? "heading" : undefined} aria-level={heading ? 2 : undefined}>
        {#if prompt}<span class="type-page block">{title}</span>{:else}{title}{/if}
      </Empty.Title>
      {#if description}<Empty.Description class={prompt ? "max-w-[28rem] leading-normal" : undefined}>{description}</Empty.Description>{/if}
    </Empty.Header>
  </Empty.Root>
{:else}
  <div role={roles[tone]} aria-label={label} class="flex min-w-0 items-start gap-2 text-muted-foreground" data-status={tone}>
    {#if icon}<Icon name={icon} decorative leading="list" />{/if}
    <div class="type-caption flex min-w-0 flex-col gap-1">
      <strong role={heading ? "heading" : undefined} aria-level={heading ? 2 : undefined}>{title}</strong>
      {#if description}<p>{description}</p>{/if}
    </div>
  </div>
{/if}
