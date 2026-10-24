import type { FileNode } from "../../../../interaction/control-nodes.ts";

/** Host mechanism, not a renderable composition: the browser owns this surface.
 * The hidden native input supplies format filters and ephemeral File handles;
 * no visual markup, styles or callbacks can be supplied by a product caller.
 * A cancelled chooser never starts a product journey. */
export function nativeFilePicker(node: FileNode): Promise<readonly File[] | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.hidden = true;
    input.accept = node.limits.accept.join(",");
    input.multiple = node.limits.maxCount > 1;
    function finish(files: readonly File[] | null) { input.remove(); resolve(files); }
    input.addEventListener("cancel", () => finish(null), { once: true });
    input.addEventListener("change", () => finish(input.files?.length ? Array.from(input.files) : null), { once: true });
    document.body.append(input);
    try { input.click(); } catch (error) { input.remove(); reject(error); }
  });
}
