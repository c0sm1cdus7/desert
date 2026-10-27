// The private asset store and its reservations. An object links an attached asset through its own asset column, a
// foreign key to desert_assets (src/storage/fact-columns.ts), so there is no separate link table.
import { Type } from "@sinclair/typebox";
import type { AssetQuota } from "../../assets/policy.ts";
import type { PrivateAssetMetadata } from "../../assets/types.ts";
import { column, nullable } from "../columns.ts";
import { defineTable, references } from "../declare.ts";
import { identitiesTable, runsTable } from "./local.ts";

const closed = { additionalProperties: false } as const;

export const assetStoreTable = defineTable({ name: "desert_asset_store", primaryKey: ["singleton"], unique: [["id"], ["installation"]],
  row: Type.Object({
    // The quota is re-checked by requireAssetQuota (src/assets/policy.ts) on every read.
    singleton: column.singleton(true), id: column.uuid(), installation: column.uuid(),
    quota: column.json(Type.Unsafe<AssetQuota>({}), { object: true }),
  }, closed) });

export const assetsTable = defineTable({ name: "desert_assets", primaryKey: ["id"], unique: [["run_id", "input_field"]],
  foreignKeys: [
    { columns: ["store_id"], references: references(assetStoreTable, "id") },
    { columns: ["actor"], references: references(identitiesTable, "id") },
    { columns: ["run_id"], references: references(runsTable, "id") },
  ], row: Type.Object({
    id: column.uuid(), store_id: column.uuid(), actor: column.uuid(), run_id: column.uuid(), input_field: column.text(),
    contract_digest: column.text(), state: column.oneOf(["reserved", "uploading", "ready", "failed", "attached"]),
    declared_size: column.integer({ exclusiveMinimum: 0 }), reserved_bytes: column.bigint({ exclusiveMinimum: 0 }),
    // Metadata is produced by the media pipeline (src/assets/media-processing.ts) and re-read through it.
    metadata: nullable(column.json(Type.Unsafe<PrivateAssetMetadata>({}))),
  }, closed) });
