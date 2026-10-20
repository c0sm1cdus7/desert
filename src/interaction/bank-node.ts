import { type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { BankNodeSchema } from "./bank-schema.ts";
import { controlNode, type ControlNode } from "./control-nodes.ts";
import { surfaceFrame, checkFrameContent } from "./surface-frame.ts";
import { transientFrame } from "./transient-frame.ts";
import type { PrimitiveId } from "./catalog.ts";
import { checkCatalogHome } from "../public-catalog/node-schema.ts";
import { inputMask } from "./input-mask.ts";

export type BankNode = Frozen<Static<typeof BankNodeSchema>>;
export type BankNodeFor<K extends PrimitiveId> = Extract<BankNode, { kind: K }>;
export const BankVersion = "desert.bank-node/1" as const;

/** Validate JSON shape and the same semantic owners used by product frames and controls. */
export function bankNode(value: unknown): BankNode {
  const node: unknown = jsonSnapshot(value);
  if (!Check(BankNodeSchema, node)) throw new Error("INVALID_BANK_NODE");
  if (node.kind === "input.text" && node.mask) inputMask(node.mask);
  if ("control" in node) controlNode(node.control);
  if (node.kind === "catalog.home") checkCatalogHome(node);
  if ("content" in node) checkFrameContent(node.content);
  if (node.kind === "fact") checkFrameContent(node.details);
  if (node.kind === "transient") transientFrame(surfaceFrame(node.frame), node.locked);
  if (node.kind === "action" && ((node.role === "primary" && ["back", "close", "catalog.back"].includes(node.action.intent.kind)) ||
    (node.form && node.action.intent.kind !== "journey"))) throw new Error("INVALID_BANK_ACTION");
  if (node.kind === "collection" && (new Set(node.records.map(record => record.id)).size !== node.records.length ||
    node.records.some(record => Object.keys(record.facts).some(field => !node.fields.includes(field))) ||
    node.fields.some(field => !Object.hasOwn(node.labels, `${node.object}.${field}`)))) throw new Error("INVALID_BANK_COLLECTION");
  return freezeDeep(node);
}

/** Wrap the installed control grammar without widening it into product authoring. */
export function controlBankNode(control: ControlNode): Extract<BankNode, { control: ControlNode }> {
  const node = bankNode({ version: BankVersion, kind: `control.${control.kind}`, control });
  if (!("control" in node)) throw new Error("BANK_CONTROL_REQUIRED");
  return node;
}
