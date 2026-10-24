<script lang="ts">
  import { Action } from "../../index.ts";
  import { Text } from "../../index.ts";
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
<div role="group" class="group/field flex w-full flex-col gap-2 [&>.sr-only]:w-auto" data-files data-disabled={checked.disabled}
  data-invalid={rejected.length > 0} aria-labelledby={`${id}-label`} aria-describedby={`${id}-limits`}>
  <span id={`${id}-label`} data-files-label class={stackTitle() === checked.label ? "sr-only"
    : "flex w-fit items-center gap-2 type-control leading-snug select-none group-data-[invalid=true]/field:text-destructive-text"}>{checked.label}</span>
  <Action icon="open" label="Choose files" face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"} onclick={choose} />
  <Text id={`${id}-limits`} kind="caption" tone="muted" inset="row"
    text={`Up to ${checked.limits.maxCount} files · ${fileSize(checked.limits.maxFileBytes)} each · ${fileSize(checked.limits.maxTotalBytes)} total. Choosing files does not upload them.`} />
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label="Selected local files" data-files-list>
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 break-all">{file.name} · {fileSize(file.size)}</span>
          <Action icon="close" label={`Remove ${file.name}`} face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent?.(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {:else}<Text kind="caption" tone="muted" inset="row" text="No local files selected." />{/if}
  <div role="status" aria-live="polite" data-files-status>
    {#each rejected as item (item.file.id)}<Text kind="support" tone="destructive" text={`${item.file.name}: ${reasons[item.reason]}.`} />{/each}
  </div>
</div>
