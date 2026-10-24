<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { cn } from "../../../vendor/utils.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, value, maxLength }: CatalogProps<"character-counter"> = $props();
  // Match JSON Schema's code-point length, not HTML maxlength's UTF-16 units.
  const count = $derived([...value].length);
  const remaining = $derived(maxLength === undefined ? undefined : maxLength - count);
  const exceeded = $derived(remaining !== undefined && remaining < 0);
</script>

<Group.Addon align="block-end" class="px-4 pb-2">
  <Group.Text {id} data-character-counter data-exceeded={exceeded}
    class={cn("ms-auto block min-w-0 text-end type-caption text-(length:--text-caption) tabular-nums", exceeded && "text-destructive-text")}>
    {#if remaining === undefined}{count} {count === 1 ? "character" : "characters"}
    {:else if exceeded}{-remaining} over limit
    {:else}{remaining} remaining{/if}
  </Group.Text>
</Group.Addon>
