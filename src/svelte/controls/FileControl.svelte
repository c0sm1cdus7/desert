<script lang="ts">
  import * as Field from "../vendor/components/ui/field/index.js";
  import Action from "../pieces/Action.svelte";
  import { Input } from "../vendor/components/ui/input/index.js";
  import { fileNode, type FileRejection } from "../../interaction/control-nodes.ts";
  import type { ControlProps } from "../renderer-contracts.ts";
  import { fileSize } from "../pieces/file-size.ts";
  import { currentStackTitle } from "../pieces/stack-context.ts";
  let { node, host, onevent }: ControlProps<"files"> = $props();
  let checked = $derived(fileNode(node));
  let rejected = $state<readonly FileRejection[]>([]);
  const id = $props.id();
  const stackTitle = currentStackTitle();
  let picker = $state<HTMLInputElement | null>(null);
  const reasons = { "media-type": "File type is not accepted", "file-size": "File is too large",
    "total-size": "Total size limit exceeded", count: "File count limit reached" };
  function choose(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const selection = host.choose(checked, Array.from(input.files ?? []));
    rejected = selection.result.rejected;
    onevent(selection.event);
    input.value = "";
  }
</script>
<Field.Field data-control="files" data-disabled={checked.disabled} data-invalid={rejected.length > 0}>
  <Field.FieldLabel for={id} class={stackTitle() === checked.label ? "sr-only" : undefined}>{checked.label}</Field.FieldLabel>
  <Input bind:ref={picker} {id} type="file" hidden tabindex={-1} multiple={checked.limits.maxCount > 1} accept={checked.limits.accept.join(",")}
    disabled={checked.disabled} onchange={choose} aria-describedby={`${id}-limits`} aria-invalid={rejected.length > 0} />
  <Action icon="open" label="Choose files" state={checked.disabled ? "unavailable" : "ready"} onclick={() => picker?.click()} />
  <Field.FieldDescription id={`${id}-limits`}>
    Up to {checked.limits.maxCount} files · {fileSize(checked.limits.maxFileBytes)} each · {fileSize(checked.limits.maxTotalBytes)} total.
    Nothing is uploaded.
  </Field.FieldDescription>
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label="Selected local files">
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 break-all">{file.name} · {fileSize(file.size)}</span>
          <Action icon="close" label={`Remove ${file.name}`} state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {:else}<Field.FieldDescription>No local files selected.</Field.FieldDescription>{/if}
  <div role="status" aria-live="polite">
    {#each rejected as item (item.file.id)}<p class="text-destructive">{item.file.name}: {reasons[item.reason]}.</p>{/each}
  </div>
</Field.Field>
