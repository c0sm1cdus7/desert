import assert from "node:assert/strict";
import test from "node:test";
import { Components, defineView, defineModule, moduleIndex, viewOutput } from "../src/index.ts";
import { requireModuleHandle } from "../src/modules/references.ts";

function sourceView() {
  return defineView({ name: "owned-view", outputs: ["close"],
    topDock: Components.Toolbar({ actions: [{ output: "close", label: "Close", icon: "close" }] }),
    content: [Components.Header({ title: "Original title", subtitle: "Original subtitle" })] });
}

test("A private original cannot be re-registered and published by another module owner", () => {
  const original = sourceView();
  defineModule({ id: "private-owner", views: [original] });
  assert.throws(() => defineModule({ id: "republisher", views: [original],
    exports: { views: { leaked: original } } }), /FOREIGN_MODULE_DEFINITION/);
});

test("A public original cannot acquire another owner by bypassing its issued reference", () => {
  const original = sourceView();
  defineModule({ id: "public-owner", views: [original], exports: { views: { item: original } } });
  assert.throws(() => defineModule({ id: "republisher", views: [original],
    exports: { views: { item: original } } }), /FOREIGN_MODULE_DEFINITION/);
});

test("A homonymous new owner cannot re-publish an original private declaration", () => {
  const original = sourceView();
  defineModule({ id: "same-owner-name", views: [original] });
  assert.throws(() => defineModule({ id: "same-owner-name", views: [original],
    exports: { views: { leaked: original } } }), /FOREIGN_MODULE_DEFINITION/);
});

test("Registering the exact unchanged module declaration reuses its handle and public references", () => {
  const original = sourceView();
  const source = { id: "idempotent-owner", views: [original], exports: { views: { item: original } } };
  const first = defineModule(source), second = defineModule(source);
  assert.equal(first, second);
  assert.equal(moduleIndex([first]).views.item, moduleIndex([second]).views.item);
});

test("Re-registering an altered module declaration fails instead of silently reusing stale admission", () => {
  const original = sourceView();
  const source = { id: "changed-owner", views: [original], exports: { views: { item: original } } };
  defineModule(source);
  source.views.splice(0, 1, sourceView());
  assert.throws(() => defineModule(source), /MUTATED_MODULE_DEFINITION/);
});

test("An issued view reference remains immutable at every admitted source layer", () => {
  const original = sourceView();
  const module = defineModule({ id: "snapshot-owner", views: [original], exports: { views: { item: original } } });
  const reference = moduleIndex([module]).views.item;
  const before = structuredClone(requireModuleHandle(module).definition);
  assert.equal(Reflect.set(original, "id", "changed-id"), false);
  assert.equal(Reflect.set(original.outputs, "0", "injected"), false);
  assert.equal(Reflect.set(original.topDock.actions[0], "output", "injected"), false);
  assert.equal(Reflect.set(original.content[0], "title", "Changed title"), false);
  assert.deepEqual(requireModuleHandle(module).definition, before);
  assert.equal(reference.id, "owned-view");
  assert.deepEqual(viewOutput(reference, "close"), { view: reference, output: "close" });
  assert.throws(() => viewOutput(reference, "injected" as never), /UNKNOWN_VIEW_OUTPUT_REFERENCE/);
  assert.ok(Object.isFrozen(reference));
});

test("An immutable isolated view keeps one identity across repeated uses of its public alias", () => {
  const original = defineView({ name: "isolated", outputs: ["close"], content: [] });
  const module = defineModule({ id: "isolated-owner", views: [original], exports: { views: { item: original } } });
  const firstCatalog = moduleIndex([module]), secondCatalog = moduleIndex([module]);
  const first = viewOutput(firstCatalog.views.item, "close");
  const second = viewOutput(secondCatalog.views.item, "close");
  assert.equal(first.view, second.view);
  assert.equal(firstCatalog.views.item, secondCatalog.views.item);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(original));
  assert.ok(Object.isFrozen(requireModuleHandle(module).definition));
});

test("Copying an issued reference does not preserve its authority", () => {
  const original = sourceView();
  const module = defineModule({ id: "token-owner", views: [original], exports: { views: { item: original } } });
  const reference = moduleIndex([module]).views.item;
  assert.throws(() => viewOutput({ ...reference }, "close"), /UNREGISTERED_MODULE_REFERENCE/);
});
