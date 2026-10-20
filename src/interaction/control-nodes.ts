import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { InformationItemSchema } from "./information-content.ts";
import { ExtendedNodeSchemas, ExtendedEventSchemas } from "./extended-nodes.ts";
import { checkExtendedControl, changeExtendedControl } from "./extended-controls.ts";
import { SelectionOptionSchema } from "./selection-option.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
export const SelectNodeSchema = object({ ...base, kind: Type.Literal("select"), required: Type.Boolean(),
  value: Type.Union([Type.Null(), text()]), options: Type.Array(SelectionOptionSchema, { minItems: 1 }) });
export const PopoverNodeSchema = object({ ...base, kind: Type.Literal("popover"), open: Type.Boolean(), title: text(),
  locked: Type.Optional(Type.Boolean()), content: Type.Array(InformationItemSchema, { minItems: 1 }) });
export const FileMetadataSchema = object({ id: text(), name: text(), size: integer(),
  mediaType: Type.String(), lastModified: integer() });
export const FileNodeSchema = object({ ...base, kind: Type.Literal("files"),
  limits: object({ maxCount: integer(1), maxFileBytes: integer(1), maxTotalBytes: integer(1),
    accept: Type.Array(Type.String({ pattern: "^[a-z0-9!#$&^_.+-]+/([a-z0-9!#$&^_.+-]+|\\*)$" }), { uniqueItems: true }) }),
  files: Type.Array(FileMetadataSchema) });
export const ControlNodeSchema = Type.Union([SelectNodeSchema, PopoverNodeSchema, FileNodeSchema, ...ExtendedNodeSchemas]);
export type ControlNode = Frozen<Static<typeof ControlNodeSchema>>;
export type SelectNode = Extract<ControlNode, { kind: "select" }>;
export type PopoverNode = Extract<ControlNode, { kind: "popover" }>;
export type FileNode = Extract<ControlNode, { kind: "files" }>;
export type FileMetadata = Frozen<Static<typeof FileMetadataSchema>>;
export type FileRejection = { readonly file: FileMetadata; readonly reason: "media-type" | "file-size" | "total-size" | "count" };

export const ControlEventSchema = Type.Union([
  object({ kind: Type.Literal("select.change"), control: text(), value: Type.Union([text(), Type.Null()]) }),
  object({ kind: Type.Literal("popover.open"), control: text(), open: Type.Boolean() }),
  object({ kind: Type.Literal("files.choose"), control: text(), files: Type.Array(FileMetadataSchema) }),
  object({ kind: Type.Literal("files.remove"), control: text(), file: text() }),
  ...ExtendedEventSchemas,
]);
export type ControlEvent = Frozen<Static<typeof ControlEventSchema>>;
export type ControlTransition = { readonly node: ControlNode; readonly rejected: readonly FileRejection[] };

function unique(ids: readonly string[]) { return new Set(ids).size === ids.length; }
function rejection(node: FileNode, file: FileMetadata, current: readonly FileMetadata[]): FileRejection["reason"] | undefined {
  const { limits } = node;
  if (limits.accept.length && !limits.accept.some(type => type === file.mediaType ||
    (type.endsWith("/*") && file.mediaType.startsWith(type.slice(0, -1))))) return "media-type";
  if (file.size > limits.maxFileBytes) return "file-size";
  if (current.length >= limits.maxCount) return "count";
  if (file.size > limits.maxTotalBytes - current.reduce((total, entry) => total + entry.size, 0)) return "total-size";
}

/** Bank descriptors only: this does not install product authoring or execution. */
export function controlNode(value: unknown): ControlNode {
  const node = jsonSnapshot(value);
  if (!Check(ControlNodeSchema, node)) throw new Error("INVALID_CONTROL_NODE");
  if (node.kind === "select" && (!unique(node.options.map(item => item.value)) ||
    (node.value !== null && !node.options.some(item => item.value === node.value)))) throw new Error("INVALID_CONTROL_SELECTION");
  if (node.kind === "popover" && node.disabled && node.open) throw new Error("INVALID_CONTROL_POPOVER");
  if (node.kind === "files") {
    if (!unique(node.files.map(item => item.id)) || node.files.some((file, index) => rejection(node, file, node.files.slice(0, index)))) {
      throw new Error("INVALID_CONTROL_FILES");
    }
  }
  if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files") checkExtendedControl(node);
  return freezeDeep(node);
}

export function selectNode(value: unknown): SelectNode {
  const node = controlNode(value);
  if (node.kind !== "select") throw new Error("SELECT_NODE_REQUIRED");
  return node;
}
export function popoverNode(value: unknown): PopoverNode {
  const node = controlNode(value);
  if (node.kind !== "popover") throw new Error("POPOVER_NODE_REQUIRED");
  return node;
}
export function fileNode(value: unknown): FileNode {
  const node = controlNode(value);
  if (node.kind !== "files") throw new Error("FILE_NODE_REQUIRED");
  return node;
}

/** Pure local interaction; file MIME metadata is not trusted content inspection. */
export function applyControlEvent(value: ControlNode, input: unknown): ControlTransition {
  const node = controlNode(value);
  const event = jsonSnapshot(input);
  if (!Check(ControlEventSchema, event) || event.control !== node.id) throw new Error("INVALID_CONTROL_EVENT");
  if (node.disabled) throw new Error("CONTROL_DISABLED");
  let next: ControlNode;
  const rejected: FileRejection[] = [];
  if (node.kind === "select" && event.kind === "select.change") {
    if (event.value === null ? node.required : !node.options.some(item => item.value === event.value && !item.disabled)) {
      throw new Error("INVALID_CONTROL_EVENT");
    }
    next = { ...node, value: event.value };
  } else if (node.kind === "popover" && event.kind === "popover.open") {
    if (node.locked && node.open && !event.open) throw new Error("CONTROL_LOCKED");
    next = { ...node, open: event.open };
  } else if (node.kind === "files" && event.kind === "files.choose") {
    if (!unique([...node.files, ...event.files].map(file => file.id))) throw new Error("INVALID_CONTROL_EVENT");
    const files = [...node.files];
    for (const file of event.files) {
      const reason = rejection(node, file, files);
      if (reason) rejected.push({ file, reason });
      else files.push(file);
    }
    next = { ...node, files };
  } else if (node.kind === "files" && event.kind === "files.remove" && node.files.some(file => file.id === event.file)) {
    next = { ...node, files: node.files.filter(file => file.id !== event.file) };
  } else if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files" &&
    (event.kind === "options.change" || event.kind === "money.change" || event.kind === "date.change")) {
    next = changeExtendedControl(node, event);
  } else throw new Error("INVALID_CONTROL_EVENT");
  return freezeDeep({ node: controlNode(next), rejected });
}
