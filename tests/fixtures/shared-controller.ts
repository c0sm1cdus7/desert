import { actorId, controllerRole, createCommand, enumeration, fromInput, literal, mutationJourney, objectType, ownershipPolicy, principal, readJourney, text, updateCommand } from "../../src/index.ts";
import { product } from "../../src/contracts.ts";

const Memo = objectType({ id: "memo", facts: {
  title: text({ minLength: 1 }), owner: principal(), state: enumeration(["active", "archived"]),
} });
const Bookmark = objectType({ id: "bookmark", facts: {
  address: text({ minLength: 1 }), owner: principal(), state: enumeration(["saved", "removed"]),
} });
export const SharedController = controllerRole({ id: "workspace", objects: [Memo, Bookmark], requires: [] });
const requires = { controller: SharedController, dependencies: [] };
const CreateMemo = mutationJourney("create-memo", createCommand("create-memo-record", Memo, {
  input: ["title"], values: { title: fromInput("title"), owner: actorId(), state: literal("active") },
}), requires);
const ArchiveMemo = mutationJourney("archive-memo", updateCommand("archive-memo-record", Memo, {
  input: [], when: { state: "active" }, set: { state: literal("archived") },
}), requires);
const ReadMemo = readJourney("read-memo", Memo, { fields: ["title", "state"], collection: ["title"], requires });
const CreateBookmark = mutationJourney("create-bookmark", createCommand("create-bookmark-record", Bookmark, {
  input: ["address"], values: { address: fromInput("address"), owner: actorId(), state: literal("saved") },
}), requires);
const RemoveBookmark = mutationJourney("remove-bookmark", updateCommand("remove-bookmark-record", Bookmark, {
  input: [], when: { state: "saved" }, set: { state: literal("removed") },
}), requires);
const ReadBookmark = readJourney("read-bookmark", Bookmark, { fields: ["address", "state"], collection: ["address"], requires });
export const SharedProduct = product({
  id: "shared-store", objects: [Memo, Bookmark], dependencies: [SharedController],
  policies: [ownershipPolicy(Memo, "owner"), ownershipPolicy(Bookmark, "owner")],
  journeys: [CreateMemo, ReadMemo, ArchiveMemo, CreateBookmark, ReadBookmark, RemoveBookmark],
  surfaces: [{ id: "agent", kind: "agent", journeys:
    [CreateMemo, ReadMemo, ArchiveMemo, CreateBookmark, ReadBookmark, RemoveBookmark].map(journey => journey.id) }],
});
