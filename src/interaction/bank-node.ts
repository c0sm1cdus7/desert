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
import { collectionSummary } from './collection-summary.ts';

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
  if(node.kind==='collection'&&node.presentation?.kind==='summary-widget'){
    if(!node.fields.includes(node.presentation.field))throw new Error('INVALID_WIDGET_FIELD');
    collectionSummary(node.records,node.presentation);
  }
  if (node.kind === "collection" && (new Set(node.records.map(record => record.id)).size !== node.records.length ||
    (node.presentation?.kind === "media-grid" && [node.presentation.image, node.presentation.fit, node.presentation.description]
      .some(field => field !== undefined && !node.fields.includes(field))) ||
    (node.presentation?.kind === "collection-grid" && (!node.fields.includes(node.presentation.title) ||
      new Set(node.presentation.previews.map(preview => preview.id)).size !== node.presentation.previews.length ||
      node.presentation.previews.some(preview => !node.records.some(record => record.id === preview.id)))) ||
    node.records.some(record => Object.keys(record.facts).some(field => !node.fields.includes(field))) ||
    Object.keys(node.valueLabels ?? {}).some(field => !node.fields.includes(field)) ||
    Object.entries(node.attention ?? {}).some(([id,signals])=>!node.records.some(record=>record.id===id)||signals.some(signal=>
      signal.target.kind!=='object'||signal.target.object!==node.object||signal.target.id!==id)) ||
    node.fields.some(field => !Object.hasOwn(node.labels, `${node.object}.${field}`)))) throw new Error("INVALID_BANK_COLLECTION");
  return freezeDeep(node);
}

/** Wrap the installed control grammar without widening it into product authoring. */
export function controlBankNode(control: ControlNode): Extract<BankNode, { control: ControlNode }> {
  const node = bankNode({ version: BankVersion, kind: `control.${control.kind}`, control });
  if (!("control" in node)) throw new Error("BANK_CONTROL_REQUIRED");
  return node;
}
