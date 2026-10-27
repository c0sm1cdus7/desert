// Three successive declarations of one product, for the migration plan (plan §15, step 7.3).
// v1 → v2 is additive only: a new object (book), a new reference fact (entry.books), a wider enum and a longer title.
// v2 → v3 is destructive: it drops a fact (tags), a reference fact (books) and an object (book), narrows the enum (draft
// is gone), shortens the title and adds a required fact (priority); each needs its explicit decision.
import { enumeration, integer, labels, objectType, ownershipPolicy, principal, references, text } from "../../src/index.ts";
import { product } from "../../src/contracts.ts";
import { clientInstallation } from "../../src/storage/client-installation.ts";

export const English = clientInstallation({ language: "en" });

const EntryV1 = objectType({ id: "entry", facts: {
  title: text({ minLength: 1, maxLength: 40 }), state: enumeration(["draft", "active", "archived"]), owner: principal(),
  tags: labels({ maxItems: 3, maxLength: 10 }),
} });
export const LedgerV1 = product({ id: "ledger", objects: [EntryV1], policies: [ownershipPolicy(EntryV1, "owner")] });

const Book = objectType({ id: "book", facts: {
  name: text({ minLength: 1, maxLength: 40 }), color: enumeration(["blue", "rose"]), owner: principal(),
} });
const EntryV2 = objectType({ id: "entry", facts: {
  title: text({ minLength: 1, maxLength: 80 }), state: enumeration(["draft", "active", "archived", "paused"]), owner: principal(),
  tags: labels({ maxItems: 3, maxLength: 10 }), books: references(Book, { label: "name", color: "color" }),
} });
export const LedgerV2 = product({ id: "ledger", objects: [Book, EntryV2], policies: [ownershipPolicy(Book, "owner"), ownershipPolicy(EntryV2, "owner")] });

const EntryV3 = objectType({ id: "entry", facts: {
  title: text({ minLength: 1, maxLength: 10 }), state: enumeration(["active", "archived", "paused"]), owner: principal(),
  priority: integer({ minimum: 1, maximum: 5 }),
} });
export const LedgerV3 = product({ id: "ledger", objects: [EntryV3], policies: [ownershipPolicy(EntryV3, "owner")] });

/** Every decision v2 → v3 needs, as an owner would declare them in scripts/storage-products.ts. */
export const v3Decisions = [
  { object: "entry", drop: { field: "tags", approvedBy: "franco" } },
  { object: "entry", drop: { field: "books", approvedBy: "franco" } },
  { object: "book", drop: { approvedBy: "franco" } },
  { object: "entry", migrate: { field: "state", from: "draft", to: "active" } },
  { object: "entry", narrow: { field: "title", approvedBy: "franco" } },
  { object: "entry", fill: { field: "priority", value: 3, approvedBy: "franco" } },
] as const;
