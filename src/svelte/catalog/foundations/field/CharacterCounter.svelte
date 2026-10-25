<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { cn } from "../../../vendor/utils.js";
  // The caption under a multiline Field: its characters, or how many remain before its limit and by how many it is over.
  let { id, value, maxLength }: { id: string; value: string; maxLength: number | undefined } = $props();
  // Match JSON Schema's code-point length, not HTML maxlength's UTF-16 units.
  const count = $derived([...value].length);
  const remaining = $derived(maxLength === undefined ? undefined : maxLength - count);
  const exceeded = $derived(remaining !== undefined && remaining < 0);
</script>

<Group.Addon align="block-end" class="px-4 pb-2">
  <Group.Text {id} data-character-counter data-exceeded={exceeded}
    class={cn("ms-auto block min-w-0 text-end type-caption text-(length:--text-caption) tabular-nums", exceeded && "text-destructive-text")}>
    {#if remaining === undefined}{say(count === 1 ? m.field.character : m.field.characters, { count: String(count) })}
    {:else if exceeded}{say(m.field.overLimit, { count: String(-remaining) })}
    {:else}{say(m.field.remaining, { count: String(remaining) })}{/if}
  </Group.Text>
</Group.Addon>
