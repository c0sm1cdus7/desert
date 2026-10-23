import assert from "node:assert/strict";
import test from "node:test";
import { gate, postReceiptFlow } from "./fixtures/post-receipt-flow.ts";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";

for (const operation of ["invoke", "accept", "recover"] as const) {
  test(`${operation} unlocks after a valid receipt but still awaits the post-receipt read`, async () => {
    const f = postReceiptFlow(), read = gate();
    if (operation !== "invoke") await f.seedReview(operation === "recover");
    f.control.refresh = () => read.promise;
    let returned = false;
    const pending = (operation === "invoke" ? f.flow.invoke(f.journey) : f.flow[operation]()).then(() => { returned = true; });
    try {
      await until(() => f.refreshes() === 1);
      assert.equal(f.store.get().view, "detail");
      assert.equal(f.store.get().busy, false);
      assert.equal(f.store.get().pendingAction, null);
      assert.equal(returned, false, "The public operation promise still includes its read refresh");
    } finally { read.release(); await pending; }
    assert.equal(returned, true);
    assert.equal(f.calls.filter(method => method === "accept").length, operation === "recover" ? 0 : 1);
  });
}

for (const outcome of ["success", "failure"] as const) {
  test(`A late post-receipt read ${outcome} cannot finish or fail a newer mutation`, async () => {
    const f = postReceiptFlow(), firstRead = gate(), secondPrepare = gate();
    f.control.refresh = () => firstRead.promise;
    const first = f.flow.invoke(f.journey);
    let second: Promise<void> | undefined;
    try {
      await until(() => f.refreshes() === 1);
      assert.equal(f.store.get().busy, false);
      f.control.refresh = async () => {};
      f.control.beforePrepare = () => secondPrepare.promise;
      f.store.update({ view: "create", draft: { title: "Second", body: "New private body" } });
      second = f.flow.invoke(f.journey);
      await until(() => f.calls.filter(method => method === "prepare").length === 2);
      if (outcome === "success") firstRead.release();
      else firstRead.reject(new Error("Delayed read failed"));
      await first;
      assert.equal(f.store.get().busy, true);
      assert.equal(f.store.get().pendingAction, "invoke");
      assert.equal(f.store.get().error, null);
      assert.equal(f.store.get().uncertain, false);
      assert.equal(f.store.get().view, "create");
      assert.equal(f.store.get().draft.title, "Second");
      secondPrepare.release(); await second;
      assert.equal(f.store.get().selectedId, "record-run-2");
      assert.equal(f.store.get().busy, false);
      assert.equal(f.calls.filter(method => method === "accept").length, 2);
    } finally { firstRead.release(); secondPrepare.release(); await first; await second; }
  });
}

test("An invalid receipt cannot become a completed unlocked detail or start a read refresh", async () => {
  const f = postReceiptFlow();
  f.control.corruptReceipt = true;
  await f.flow.invoke(f.journey);
  assert.equal(f.store.get().view, "recovery");
  assert.equal(f.store.get().uncertain, true);
  assert.equal(f.store.get().error, "INVALID_RESPONSE");
  assert.ok(f.store.get().prepared);
  assert.equal(f.refreshes(), 0);
});

test("A read failure after a valid receipt cannot turn the accepted write into uncertain recovery", async () => {
  const f = postReceiptFlow();
  f.control.refresh = async () => { throw new Error("Read failed after commit"); };
  await f.flow.invoke(f.journey);
  assert.equal(f.store.get().view, "detail");
  assert.equal(f.store.get().prepared, null);
  assert.equal(f.store.get().uncertain, false);
  assert.equal(f.store.get().error, null);
  assert.equal(f.store.get().busy, false);
  assert.equal(f.calls.filter(method => method === "accept").length, 1);
});

test("An older read failure cannot alter the recovery of a newer invalid receipt", async () => {
  const f = postReceiptFlow(), firstRead = gate();
  f.control.refresh = () => firstRead.promise;
  const first = f.flow.invoke(f.journey);
  try {
    await until(() => f.refreshes() === 1);
    f.control.corruptReceipt = true;
    f.store.update({ view: "create", draft: { title: "Second", body: "Second body" } });
    await f.flow.invoke(f.journey);
    const recovery = f.store.get();
    assert.equal(recovery.view, "recovery");
    assert.equal(recovery.error, "INVALID_RESPONSE");
    assert.equal(recovery.uncertain, true);
    firstRead.reject(new Error("Old read failed")); await first;
    assert.deepEqual(f.store.get(), recovery);
  } finally { firstRead.release(); await first; }
});

test("A completed creation can navigate before its read returns, and that read cannot restore Notes", async t => {
  const f = await runtimeFixture(t), read = gate();
  const fetch = globalThis.fetch;
  let accepted = false, held = false, readReturned = false;
  t.mock.method(globalThis, "fetch", async (...args: Parameters<typeof fetch>) => {
    const response = await fetch(...args);
    if (String(args[0]).endsWith("/accept")) accepted = true;
    if (accepted && !held && String(args[0]).endsWith("/read")) { held = true; await read.promise; readReturned = true; }
    return response;
  });
  f.model.navigate("notes");
  f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } });
  f.emit({ kind: "input.change", name: "title", value: "Navigate after save" });
  f.emit({ kind: "input.change", name: "body", value: "Saved body" });
  f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "editor", output: "save" } });
  try {
    await until(() => held);
    assert.equal(f.model.snapshot().state.view, "detail");
    f.model.navigate("catalog");
    assert.equal(f.model.snapshot().activeDestination, "catalog");
    read.release();
    await until(() => readReturned);
    assert.equal(f.model.snapshot().activeDestination, "catalog");
    assert.equal(f.model.snapshot().panel, null);
    assert.equal(f.calls.filter(call => call.method === "accept").length, 1);
  } finally { read.release(); }
});
