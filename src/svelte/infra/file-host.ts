import { applyControlEvent, type ControlEvent, type FileNode, type FileMetadata } from "../../interaction/control-nodes.ts";

type FileEvent = Extract<ControlEvent, { kind: "files.choose" | "files.remove" }>;
/** Opens a chooser for a files node and resolves the chosen files, or null when the person cancels. */
export type FileChooser = (node: FileNode) => Promise<readonly File[] | null>;

/** Ephemeral host-owned browser handles, never part of the interaction contract. */
export class LocalFileHost {
  #handles = new Map<string, File>();
  #chooser: FileChooser | undefined;
  /** The browser chooser a foundation offers (shell offers the file-picker mechanism of files); this host owns no DOM.
   * The latest offer is used until it is released. */
  offerChooser(chooser: FileChooser): () => void {
    this.#chooser = chooser;
    return () => { if (this.#chooser === chooser) this.#chooser = undefined; };
  }
  /** Opens the offered chooser for the create-from-file journey (web/client/file-entry.ts). */
  async pick(node: FileNode) {
    const chooser = this.#chooser;
    if (!chooser) throw new Error("FILE_PICKER_UNAVAILABLE: no foundation offered a file chooser to this host");
    const files = await chooser(node);
    if (!files) return null;
    const chosen = this.choose(node, files);
    if (chosen.result.rejected.length) {
      if (chosen.result.node.kind === "files") for (const file of chosen.result.node.files) this.release(file.id);
      throw new Error("FILE_SELECTION_REJECTED");
    }
    return chosen.event;
  }
  choose(node: FileNode, files: readonly File[]) {
    if (files.some(file => !(file instanceof File))) throw new Error("BROWSER_FILE_REQUIRED");
    const candidates = files.map(file => ({ id: crypto.randomUUID(), name: file.name,
      size: file.size, mediaType: file.type.toLowerCase(), lastModified: file.lastModified } satisfies FileMetadata));
    const event: FileEvent = { kind: "files.choose", control: node.id, files: candidates };
    const result = applyControlEvent(node, event);
    if (result.node.kind !== "files") throw new Error("FILE_NODE_REQUIRED");
    const accepted = new Set(result.node.files.map(file => file.id));
    candidates.forEach((candidate, index) => { if (accepted.has(candidate.id)) this.#handles.set(candidate.id, files[index]!); });
    return { event, result };
  }
  remove(node: FileNode, id: string): FileEvent {
    const event: FileEvent = { kind: "files.remove", control: node.id, file: id };
    applyControlEvent(node, event);
    this.release(id);
    return event;
  }
  resolve(id: string): File | undefined { return this.#handles.get(id); }
  release(id: string) { this.#handles.delete(id); }
  dispose() { this.#handles.clear(); }
}
