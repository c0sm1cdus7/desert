<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Action } from "../../index.ts";
  import { Text } from "../../index.ts";
  import { fileNode, type FileRejection } from "../../../../interaction/control-nodes.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { fileSize } from "./file-size.ts";
  import { nativeFilePicker } from "../../mechanisms/file-picker/file-picker.ts";
  let { node, onevent }: CatalogProps<"files"> = $props();
  const provided = useFileHost();
  if (!provided) throw new Error("LOCAL_FILE_HOST_REQUIRED: files renders inside a subtree that provides a file host (provideFileHost)");
  const host = provided;
  let checked = $derived(fileNode(node));
  let rejected = $state<readonly FileRejection[]>([]);
  const id = $props.id();
  const stackTitle = currentStackTitle();
  const reasons = { "media-type": m.files.mediaType, "file-size": m.files.fileSize, "total-size": m.files.totalSize, count: m.files.count };
  /** The browser's chooser supplies the files; the host checks them against the limits and keeps the accepted handles. */
  async function choose() {
    const files = await nativeFilePicker(checked);
    if (!files) return;
    const selection = host.choose(checked, files);
    rejected = selection.result.rejected;
    onevent?.(selection.event);
  }
</script>
<div role="group" class="group/field flex w-full flex-col gap-2 [&>.sr-only]:w-auto" data-files data-disabled={checked.disabled}
  data-invalid={rejected.length > 0} aria-labelledby={`${id}-label`} aria-describedby={`${id}-limits`}>
  <span id={`${id}-label`} data-files-label class={stackTitle() === checked.label ? "sr-only"
    : "flex w-fit items-center gap-2 type-control leading-snug select-none group-data-[invalid=true]/field:text-destructive-text"}>{checked.label}</span>
  <Action icon="open" label={say(m.files.choose)} face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"} onclick={choose} />
  <!-- The limits and, with no file chosen, the empty note are one caption block (4 px apart, as the field description was). -->
  <div class="flex flex-col gap-1">
    <Text id={`${id}-limits`} kind="caption" tone="muted" inset="row"
      text={say(m.files.limits, { count: String(checked.limits.maxCount), file: fileSize(checked.limits.maxFileBytes), total: fileSize(checked.limits.maxTotalBytes) })} />
    {#if !checked.files.length}<Text kind="caption" tone="muted" inset="row" text={say(m.files.none)} />{/if}
  </div>
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label={say(m.files.selected)} data-files-list>
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 wrap-words">{say(m.files.file, { name: file.name, size: fileSize(file.size) })}</span>
          <Action icon="close" label={say(m.files.remove, { name: file.name })} face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent?.(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {/if}
  <div role="status" aria-live="polite" data-files-status>
    {#each rejected as item (item.file.id)}<Text kind="support" tone="destructive" text={say(m.files.rejected, { name: item.file.name, reason: say(reasons[item.reason]) })} />{/each}
  </div>
</div>
