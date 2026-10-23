import assert from "node:assert/strict";
import { test } from "node:test";
import { humanState } from "../src/web/client/state.ts";
import { surface } from "./fixtures/view-program.ts";

test("disposed human state removes private drafts and ignores late controller responses", () => {
  const store = humanState(surface, { kind: "presentation" });
  store.update({ draft: { body: "private unsaved content" }, selectedId: "private-record" });
  let notifications = 0;
  store.subscribe(() => notifications++);
  store.dispose();
  assert.deepEqual(store.get().draft, {});
  assert.equal(store.get().selectedId, null);
  store.update({ draft: { body: "late response" }, selectedId: "private-record" });
  assert.deepEqual(store.get().draft, {});
  assert.equal(store.get().selectedId, null);
  assert.equal(notifications, 1);
});
