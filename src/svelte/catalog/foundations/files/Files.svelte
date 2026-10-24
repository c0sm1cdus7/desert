<script lang="ts">
  import { Action } from "../../index.ts";
  import { fileNode, type FileRejection } from "../../../../interaction/control-nodes.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { fileSize } from "./file-size.ts";
  import { nativeFilePicker } from "./native-file-picker.ts";
  let { node, onevent }: CatalogProps<"files"> = $props();
  const provided = useFileHost();
  if (!provided) throw new Error("LOCAL_FILE_HOST_REQUIRED: files renders inside a subtree that provides a file host (provideFileHost)");
  const host = provided;
  let checked = $derived(fileNode(node));
  let rejected = $state<readonly FileRejection[]>([]);
  const id = $props.id();
  const stackTitle = currentStackTitle();
  const reasons = { "media-type": "File type is not accepted", "file-size": "File is too large",
    "total-size": "Total size limit exceeded", count: "File count limit reached" };
  /** The browser's chooser supplies the files; the host checks them against the limits and keeps the accepted handles. */
  async function choose() {
    const files = await nativeFilePicker(checked);
    if (!files) return;
    const selection = host.choose(checked, files);
    rejected = selection.result.rejected;
    onevent?.(selection.event);
  }
</script>
<!-- F1-merge: Text(support|caption) (lane F1a) replaces the label and note paragraphs. -->
<div role="group" class="group/field flex w-full flex-col gap-2 [&>.sr-only]:w-auto" data-files data-disabled={checked.disabled}
  data-invalid={rejected.length > 0} aria-labelledby={`${id}-label`} aria-describedby={`${id}-limits`}>
  <span id={`${id}-label`} data-files-label class={stackTitle() === checked.label ? "sr-only"
    : "flex w-fit items-center gap-2 type-control leading-snug select-none group-data-[invalid=true]/field:text-destructive-text"}>{checked.label}</span>
  <Action icon="open" label="Choose files" state={checked.disabled ? "unavailable" : "ready"} onclick={choose} />
  <p id={`${id}-limits`} data-files-note class="text-muted-foreground text-left type-caption last:mt-0 nth-last-2:-mt-1">
    Up to {checked.limits.maxCount} files · {fileSize(checked.limits.maxFileBytes)} each · {fileSize(checked.limits.maxTotalBytes)} total.
    Choosing files does not upload them.
  </p>
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label="Selected local files" data-files-list>
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 break-all">{file.name} · {fileSize(file.size)}</span>
          <Action icon="close" label={`Remove ${file.name}`} state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent?.(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {:else}<p data-files-note class="text-muted-foreground text-left type-caption last:mt-0 nth-last-2:-mt-1">No local files selected.</p>{/if}
  <div role="status" aria-live="polite" data-files-status>
    {#each rejected as item (item.file.id)}<p class="text-destructive">{item.file.name}: {reasons[item.reason]}.</p>{/each}
  </div>
</div>
