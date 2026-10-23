import test from "node:test";
import assert from "node:assert/strict";
import { viewEventOwnership, bindViewEvents } from "../src/web/client/view-events.ts";

const event = { kind: "input.change", name: "title", value: "Writing" } as const;

test("closed render envelope rejects absent, cloned, foreign and getter ownership without evaluating it", () => {
  const scope = viewEventOwnership(), foreign = viewEventOwnership();
  const owner = scope.sync(["notes", "create"], true).panel!;
  const other = foreign.sync(["notes", "create"], true).panel!;
  let evaluated = false;
  for (const candidate of [
    event, { event }, { owner, event, ignored: true }, { owner, event, [Symbol("extra")]: true },
    { get owner() { evaluated = true; return owner; }, event },
    { owner, get event() { evaluated = true; return event; } },
  ]) assert.throws(() => scope.read(candidate), /INVALID_VIEW_EVENT_ENVELOPE/);
  assert.equal(evaluated, false);
  for (const candidate of [undefined, "notes", { epoch: owner.epoch }, structuredClone(owner), other]) {
    assert.throws(() => scope.read({ owner: candidate, event }), /INVALID_VIEW_EVENT_OWNER/);
  }
  assert.throws(() => scope.read({ owner, event: { ...event, command: "invented" } }), /INVALID_BANK_EVENT/);
  assert.deepEqual(scope.read({ owner, event }), event);
});

test("instances survive projection refreshes, but never cross replacement, modal ownership or disposal", () => {
  const scope = viewEventOwnership(), main = scope.sync(["notes", "list"], false).main;
  const first = scope.sync(["notes", "create"], true);
  assert.equal(scope.sync(["notes", "create"], true).panel, first.panel);
  assert.equal(scope.read({ owner: main, event }), null);
  assert.equal(scope.read({ owner: first.main, event }), null, "Even the current main view cannot address a mounted panel");
  const captured: unknown[] = [], send = bindViewEvents(first.panel!, value => captured.push(scope.read(value)));
  send(event); assert.deepEqual(captured.pop(), event);
  scope.sync(["notes", "list"], false);
  const second = scope.sync(["notes", "create"], true);
  assert.notEqual(second.panel, first.panel);
  send(event); assert.equal(captured.pop(), null);
  scope.stop(); assert.equal(scope.read({ owner: second.panel!, event }), null);
});

test("shorter lifecycle tuples cannot reuse the previous instance", () => {
  const scope = viewEventOwnership(), previous = scope.sync(["notes", "create"], true).panel;
  assert.notEqual(scope.sync(["notes"], true).panel, previous);
});
