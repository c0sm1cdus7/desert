// Law: the migration plan diffs two generated storage models, never two hand descriptions. A model is the product's tables
// in one client installation (the shape the DDL renders), written beside that digest's DDL as
// `src/storage/generated/<product>.<language>.<digest>.json`, so a later declaration can be diffed against an earlier one
// whose source no longer exists. Raises MIGRATION_MODEL.
import { createHash } from "node:crypto";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { ClientInstallation } from "./client-installation.ts";
import { ColumnStorageSchema } from "./columns.ts";
import type { TableShape } from "./declare.ts";
import { objectStorage } from "./ddl.ts";

const closed = { additionalProperties: false } as const;
const names = Type.Array(Type.String());
const TableNameSchema = Type.Object({ namespace: Type.Optional(Type.String()), name: Type.String(), qualifiedName: Type.String() }, closed);
const TableShapeSchema = Type.Object({
  namespace: Type.Optional(Type.String()), name: Type.String(), qualifiedName: Type.String(),
  columns: Type.Array(Type.Object({ name: Type.String(), storage: ColumnStorageSchema }, closed)),
  primaryKey: names, unique: Type.Array(names),
  foreignKeys: Type.Array(Type.Object({ columns: names, references: Type.Object({ table: TableNameSchema, columns: names }, closed) }, closed)),
  indexes: Type.Array(Type.Object({ name: Type.String(), columns: names, unique: Type.Optional(Type.Literal(true)), where: Type.Optional(Type.String()) }, closed)),
  limits: Type.Array(Type.Object({ column: Type.String(), maximum: Type.Integer({ minimum: 1 }) }, closed)),
}, closed);
export const StorageModelSchema = Type.Object({
  product: Type.String(), language: Type.String(), digest: Type.String({ pattern: "^[0-9a-f]{64}$" }), tables: Type.Array(TableShapeSchema),
}, closed);
export type StorageModel = Readonly<{ product: string; language: string; digest: string; tables: readonly TableShape[] }>;

const tableName = ({ namespace, name, qualifiedName }: TableShape["foreignKeys"][number]["references"]["table"]) =>
  ({ ...(namespace === undefined ? {} : { namespace }), name, qualifiedName });

/** The product's tables as plain data, in declaration order (each table after the tables it references). */
export function storageModel(product: unknown, installation: ClientInstallation): StorageModel {
  const storage = objectStorage(product, installation);
  const tables = storage.tables.map(table => ({
    ...tableName(table), columns: table.columns.map(({ name, storage: column }) => ({ name, storage: column })),
    primaryKey: [...table.primaryKey], unique: table.unique.map(set => [...set]),
    foreignKeys: table.foreignKeys.map(key => ({ columns: [...key.columns], references: { table: tableName(key.references.table), columns: [...key.references.columns] } })),
    indexes: table.indexes.map(index => ({ ...index, columns: [...index.columns] })), limits: table.limits.map(limit => ({ ...limit })),
  }));
  return { product: storage.productId, language: installation.language, digest: storage.digest, tables };
}

export const renderModel = (model: StorageModel) => `${JSON.stringify(model, null, 2)}\n`;
export const modelPath = (model: Pick<StorageModel, "product" | "language" | "digest">) =>
  `src/storage/generated/${model.product}.${model.language}.${model.digest}.json`;
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** A committed model file, checked against its schema and its own name. */
export function readModel(path: string, text: string): StorageModel {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error(`MIGRATION_MODEL: ${path}: not JSON; contract: src/storage/model.ts`); }
  if (!Value.Check(StorageModelSchema, value)) throw new Error(`MIGRATION_MODEL: ${path}: not a storage model; contract: src/storage/model.ts`);
  const model: Static<typeof StorageModelSchema> = value;
  if (modelPath(model) !== path) throw new Error(`MIGRATION_MODEL: ${path}: names another product, language or digest; contract: src/storage/model.ts`);
  return model;
}
