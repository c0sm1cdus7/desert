import { applyControlEvent, type ControlEvent, type FileNode, type FileMetadata } from "../../interaction/control-nodes.ts";
import { nativeFilePicker } from "./native-file-picker.ts";

type FileEvent = Extract<ControlEvent, { kind: "files.choose" | "files.remove" }>;

/** Ephemeral host-owned browser handles, never part of the interaction contract. */
export class LocalFileHost {
  #handles = new Map<string, File>();
  async pick(node: FileNode) {
    const files = await nativeFilePicker(node);
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
