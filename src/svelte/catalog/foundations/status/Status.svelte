<script lang="ts">
  import * as Empty from "../../../vendor/components/ui/empty/index.js";
  import { Icon } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, description, icon, tone, size, heading }: CatalogProps<"status"> = $props();
  const roles = { neutral: undefined, offline: "status", note: "note" } as const;
</script>

{#if size === "regular"}
  <Empty.Root role={roles[tone]} data-status={tone}>
    <Empty.Header>
      {#if icon}<Empty.Media><Icon name={icon} decorative /></Empty.Media>{/if}
      <Empty.Title role={heading ? "heading" : undefined} aria-level={heading ? 2 : undefined}>{title}</Empty.Title>
      {#if description}<Empty.Description>{description}</Empty.Description>{/if}
    </Empty.Header>
  </Empty.Root>
{:else}
  <div role={roles[tone]} class="flex min-w-0 items-start gap-2 text-muted-foreground" data-status={tone}>
    {#if icon}<Icon name={icon} decorative leading="list" />{/if}
    <div class="type-caption flex min-w-0 flex-col gap-1">
      <strong role={heading ? "heading" : undefined} aria-level={heading ? 2 : undefined}>{title}</strong>
      {#if description}<p>{description}</p>{/if}
    </div>
  </div>
{/if}
