// Law: a product's object storage is generated from its fact declarations: one table per object type, then one join table
// per reference fact, written once per installation language and digest. Raises STORAGE_DECLARATION for names Postgres
// cannot hold.
import { Type, type TSchema } from "@sinclair/typebox";
import { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import type { ObjectDefinition } from "../contracts.ts";
import type { ClientInstallation } from "./client-installation.ts";
import { column } from "./columns.ts";
import { declareStorage, defineTable, references, sqlIdentifier, type Table, type TableReference } from "./declare.ts";
import { factStorage } from "./fact-columns.ts";
import { infrastructureTables } from "./infrastructure.ts";
import { renderDdl } from "./render-ddl.ts";

const closed = { additionalProperties: false } as const;
type Reference = Readonly<{ fact: string; target: string; maxItems: number }>;
/** An object type's table, and its scalar facts' columns (fact name → column) in canonical order. */
export type StoredObject = Readonly<{ id: string; table: Table; columns: readonly string[]; facts: Readonly<Record<string, string>> }>;
type Stored = StoredObject & Readonly<{ references: readonly Reference[] }>;
export type ObjectStorage = Readonly<{
  productId: string; digest: string; installation: ClientInstallation; namespace: string;
  objects: readonly StoredObject[]; tables: readonly Table[];
}>;

const fail = (where: string, what: string): never => {
  throw new Error(`STORAGE_DECLARATION: ${where}: ${what}; contract: src/storage/ddl.ts`);
};

/** Owner answers Q4/Q47: the client is the database; inside it each product of that client has its own Postgres schema. */
export const productNamespace = (productId: string) => sqlIdentifier(`product_${productId}`, `product ${productId}`);

/** The tables of one product in one client installation, after the infrastructure tables they reference. Like compile(),
 * it takes any value and reads only the compiled, validated snapshot. */
export function objectStorage(product: unknown, installation: ClientInstallation): ObjectStorage {
  const application = compile(product);
  const definition = loadDefinition(application), digest = application.digest;
  const namespace = productNamespace(definition.id);
  const owners = new Map((definition.policies ?? []).map(policy => [policy.object, policy.field]));
  const stored = new Map(definition.objects.map(object => [object.id, objectTable(namespace, object, owners.get(object.id))]));
  const joins = [...stored.values()].flatMap(({ table, references: facts }) =>
    facts.map(reference => joinTable(table, reference, stored.get(reference.target)?.table)));
  const tables = declareStorage([...[...stored.values()].map(entry => entry.table), ...joins], infrastructureTables);
  const objects = [...stored.values()].map(({ id, table, columns, facts }) => Object.freeze({ id, table, columns, facts }));
  return Object.freeze({ productId: definition.id, digest, installation, namespace, objects: Object.freeze(objects), tables });
}

function objectTable(namespace: string, object: ObjectDefinition, owner: string | undefined): Stored {
  const name = sqlIdentifier(object.id, `object ${object.id}`);
  const where = (fact: string) => `${namespace}.${name}.${fact}`;
  const taken = new Map([["id", "the generated key"], ["version", "the generated version"]]);
  const columnOf = (fact: string) => {
    const mapped = sqlIdentifier(fact, where(fact));
    const holder = taken.get(mapped);
    if (holder !== undefined && holder !== fact) fail(where(fact), `maps to column ${mapped}, already taken by ${holder}`);
    taken.set(mapped, fact);
    return mapped;
  };
  const properties: Record<string, TSchema> = { id: column.uuid(), version: column.integer({ exclusiveMinimum: 0 }) };
  const foreignKeys: { columns: string[]; references: TableReference }[] = [];
  const facts: Reference[] = [], scalars: Record<string, string> = {};
  for (const [fact, field] of Object.entries(object.facts)) {
    const storage = factStorage(where(fact), field);
    const mapped = columnOf(fact);
    if (storage.kind === "join") facts.push({ fact: mapped, target: storage.target, maxItems: storage.maxItems });
    else {
      properties[mapped] = storage.schema;
      scalars[fact] = mapped;
      if (storage.references) foreignKeys.push({ columns: [mapped], references: references(storage.references, "id") });
    }
  }
  const ownerColumn = owner === undefined ? undefined : columnOf(owner);
  const table = defineTable({
    namespace, name, row: Type.Object(properties, closed), primaryKey: ["id"], foreignKeys,
    unique: (object.unique ?? []).map(set => set.map(columnOf)),
    indexes: ownerColumn === undefined ? [] : [{ name: `${name}_by_${ownerColumn}`, columns: [ownerColumn] }],
  });
  return { id: object.id, table, columns: Object.freeze(Object.values(scalars)), facts: Object.freeze(scalars), references: facts };
}

/** `<object>_<fact>`: one row per referenced object, in the authored order; the declared maxItems is a constraint trigger. */
function joinTable(owner: Table, reference: Reference, target: Table | undefined): Table {
  const name = `${owner.name}_${reference.fact}`;
  if (!target) return fail(`${owner.qualifiedName}.${reference.fact}`, `references ${reference.target}, which is not an object of the product`);
  return defineTable({
    ...(owner.namespace === undefined ? {} : { namespace: owner.namespace }), name, primaryKey: ["object_id", "target_id"],
    row: Type.Object({ object_id: column.uuid(), target_id: column.uuid(), position: column.integer({ minimum: 0 }) }, closed),
    unique: [["object_id", "position"]],
    foreignKeys: [{ columns: ["object_id"], references: references(owner, "id") }, { columns: ["target_id"], references: references(target, "id") }],
    indexes: [{ name: `${name}_by_target`, columns: ["target_id"] }],
    limits: [{ column: "object_id", maximum: reference.maxItems }],
  });
}

export const renderObjectDdl = (definition: unknown, installation: ClientInstallation) => {
  const storage = objectStorage(definition, installation);
  const header = `-- GENERATED by src/storage/ddl.ts from product ${storage.productId}, language ${installation.language}, installation digest ${storage.digest}. Do not edit.\n`;
  return renderDdl(header, storage.tables, installation.language);
};

/** One committed file per installation language and digest: a new digest adds a file, the previous one stays for the
 * migration plan (7.3). */
export const objectDdlPath = (definition: unknown, installation: ClientInstallation) => {
  const { productId, digest } = objectStorage(definition, installation);
  return `src/storage/generated/${productId}.${installation.language}.${digest}.sql`;
};
