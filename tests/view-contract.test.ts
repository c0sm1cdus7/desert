import test from "node:test";
import assert from "node:assert/strict";
// The compiled View contract (resolved text); the declared form delegates to it after a message-shape check.
import { compiledView as view } from "../src/views/view.ts";
import { viewIndex } from "../src/views/view-index.ts";
import { ViewVersion, ViewSchema, type View } from "../src/views/schema.ts";
import * as viewSchemas from "../src/views/schema.ts";
import { TagNodeSchema } from "../src/interaction/extended-nodes.ts";

const header = { kind: "header", id: "heading", title: "Notes", subtitle: "Your writing.",
  media: { kind: "image", asset: "cover", alt: "Notebook cover" } } as const;
const text = { kind: "text", text: "A standalone introduction." } as const;
const tag = { version: "desert.control/1", kind: "tag", id: "status", label: "Draft",
  disabled: false, tone: "neutral" } as const;
const image = { version: "desert.control/1", kind: "image", id: "cover-image", label: "Cover",
  disabled: false, source: { asset: "cover" }, alt: "Notebook cover", aspect: "landscape" } as const;
const avatar = { version: "desert.control/1", kind: "avatar", id: "author", label: "Writer",
  disabled: false, source: null, fallback: "WR" } as const;
const action = { output: "create", label: "New note", icon: "create" } as const;
const toolbar = { kind: "toolbar", actions: [action] } as const;
const stack = { kind: "stack", id: "recent", title: "Recent notes", items: [tag] } as const;
const valid = { version: "desert.view/1", id: "notes", outputs: ["create"], topDock: toolbar,
  content: [header, text, stack, image, avatar,
    { kind: "stack", id: "details", title: "Details", items: [{ kind: "fact", label: "Storage", value: "Private" }] }],
} as const satisfies View;
const bare = (id: string) => ({ version: "desert.view/1", id, content: [] });
const reference = (id: string) => ({ kind: "view", view: id });
const reject = (value: unknown, message = "INVALID_VIEW") =>
  assert.throws(() => view(value), { message });

test("View preserves mixed ordered content, independent header and titled sibling stacks", () => {
  assert.equal(ViewVersion, "desert.view/1");
  const result = view(valid);
  assert.deepEqual(result, valid);
  assert.deepEqual(result.content.map(item => item.kind), ["header", "text", "stack", "image", "avatar", "stack"]);
  assert.deepEqual(view(bare("empty")).content, []);
  assert.equal(Object.hasOwn(view(bare("empty")), "leftDock"), false);
  assert.deepEqual(view({ ...bare("toolbar-only"), outputs: ["create"], bottomDock: toolbar }).bottomDock, toolbar);
});

test("Stacks require titles and direct nonempty content; headers are independent and unique", () => {
  for (const title of [undefined, "", " \n "]) {
    const candidate = { ...stack, title };
    if (title === undefined) delete (candidate as { title?: unknown }).title;
    reject({ ...valid, content: [candidate] });
  }
  reject({ ...valid, content: [stack, { ...header, id: "second" }, header] }, "MULTIPLE_VIEW_HEADERS");
  for (const items of [[], [header], [stack], [{ kind: "collapsible", items: [text] }]]) {
    reject({ ...valid, content: [{ ...stack, items }] });
  }
  for (const content of [{ kind: "stack", items: [text] }, [{ kind: "hero", title: "Media" }]]) {
    reject({ ...valid, content });
  }
});

test("Dock slots enforce kind boundaries and toolbar actions reference declared outputs", () => {
  const side = reference("detail");
  assert.deepEqual(view({ ...valid, leftDock: side, rightDock: side }).rightDock, side);
  for (const key of ["topDock", "bottomDock"]) reject({ ...valid, [key]: side });
  for (const key of ["leftDock", "rightDock"]) reject({ ...valid, [key]: toolbar });
  reject({ ...valid, outputs: ["create", "create"] }, "DUPLICATE_VIEW_OUTPUT");
  reject({ ...valid, outputs: [] }, "UNDECLARED_VIEW_OUTPUT");
  reject({ ...valid, topDock: { ...toolbar, actions: [{ ...action, output: "unknown" }] } }, "UNDECLARED_VIEW_OUTPUT");
  reject({ ...valid, topDock: { ...toolbar, actions: [{ ...action, journey: "create-note" }] } });
  reject({ ...valid, topDock: { ...toolbar, actions: [{ ...action, command: "create-note" }] } });
});

test("All authored depths reject presentation overrides and unsupported binding data", () => {
  const placements = [
    (extra: object) => ({ ...valid, ...extra }),
    (extra: object) => ({ ...valid, topDock: { ...toolbar, ...extra } }),
    (extra: object) => ({ ...valid, topDock: { ...toolbar, actions: [{ ...action, ...extra }] } }),
    (extra: object) => ({ ...valid, content: [{ ...header, ...extra }] }),
    (extra: object) => ({ ...valid, content: [{ ...stack, ...extra }] }),
    (extra: object) => ({ ...valid, content: [{ ...stack, items: [{ ...tag, ...extra }] }] }),
    (extra: object) => ({ ...valid, rightDock: { ...reference("detail"), ...extra } }),
  ];
  for (const extra of [{ class: "p-0" }, { style: "padding:0" }, { padding: 0 }, { attrs: { role: "button" } },
    { html: "<button>Unsafe</button>" }, { render: "CustomComponent" }, { input: { path: "note.body" } },
    { bindings: {} }, { journey: "create-note" }]) {
    for (const place of placements) reject(place(extra));
  }
  reject({ ...valid, content: [{ ...image, source: { asset: "cover", style: "opacity:0" } }] });
  reject({ ...valid, content: [{ ...header, media: { ...header.media, class: "custom" } }] });
  reject({ ...valid, content: [{ kind: "input.text", name: "title", value: "" }] });
  reject({ ...valid, content: [{ kind: "collection", records: [] }] });
});

test("Content identities are unique across header, stack and passive control descendants", () => {
  reject({ ...valid, content: [tag, tag] }, "DUPLICATE_VIEW_CONTENT_ID");
  reject({ ...valid, content: [header, { ...stack, id: header.id }] }, "DUPLICATE_VIEW_CONTENT_ID");
  reject({ ...valid, content: [tag, stack] }, "DUPLICATE_VIEW_CONTENT_ID");
  assert.equal(view({ ...bare("repeated-text"), content: [text, text] }).content.length, 2);
});

test("Validation snapshots data and returns a deeply frozen descriptor", () => {
  const source = structuredClone({ ...valid, content: [...valid.content] });
  const result = view(source);
  source.content.splice(0, 1);
  assert.equal(result.content.length, 6);
  assert.equal(result.content[0]?.kind, "header");
  for (const entry of [result, result.content, result.content[0], result.topDock, result.topDock?.actions,
    result.topDock?.actions[0], result.content[2]]) assert.ok(Object.isFrozen(entry));
  assert.equal(Reflect.set(result, "id", "changed"), false);
  assert.equal(result.id, "notes");
});

test("Non-JSON inputs fail without running accessors or accepting callbacks and hidden properties", () => {
  let getterCalls = 0;
  const accessor = { ...valid };
  Object.defineProperty(accessor, "content", { enumerable: true, get() { getterCalls++; return []; } });
  reject(accessor, "INVALID_VIEW_JSON");
  assert.equal(getterCalls, 0);
  const cyclic: Record<string, unknown> = { ...valid };
  cyclic.extra = cyclic;
  const hidden = { ...valid };
  Object.defineProperty(hidden, "hidden", { value: "secret" });
  for (const candidate of [cyclic, hidden, { ...valid, callback() {} }, { ...valid, [Symbol("style")]: true },
    Object.assign(Object.create({ inherited: true }), valid), { ...valid, content: new Array(3) }]) {
    reject(candidate, "INVALID_VIEW_JSON");
  }
});

test("Catalog resolves reusable side views and rejects duplicate, missing and cyclic references", () => {
  const detail = { ...bare("detail"), content: [text] };
  const main = { ...valid, leftDock: reference("detail"), rightDock: reference("detail") };
  const result = viewIndex([main, detail]);
  assert.deepEqual(result, [main, detail]);
  assert.ok(Object.isFrozen(result) && result.every(Object.isFrozen));
  for (const invalid of [[], {}, [main, detail, ...Array.from({ length: 63 }, (_, i) => bare(`extra-${i}`))]]) {
    assert.throws(() => viewIndex(invalid), { message: "INVALID_VIEW_CATALOG" });
  }
  assert.throws(() => viewIndex([detail, detail]), { message: "DUPLICATE_VIEW_ID" });
  assert.throws(() => viewIndex([main]), { message: "UNKNOWN_VIEW_REFERENCE" });
  assert.throws(() => viewIndex([{ ...detail, rightDock: reference("detail") }]), { message: "CYCLIC_VIEW_REFERENCE" });
  assert.throws(() => viewIndex([main, { ...detail, rightDock: reference("notes") }]), { message: "CYCLIC_VIEW_REFERENCE" });
});

test("Composition budgets distinguish reusable acyclic graphs from explosive expansion", () => {
  const chain = (count: number, double = false) => Array.from({ length: count }, (_, index) => ({
    ...bare(`view-${index}`),
    ...(index + 1 < count ? { rightDock: reference(`view-${index + 1}`),
      ...(double ? { leftDock: reference(`view-${index + 1}`) } : {}) } : {}),
  }));
  assert.equal(viewIndex(chain(16)).length, 16);
  assert.throws(() => viewIndex(chain(17)), { message: "VIEW_REFERENCE_DEPTH_EXCEEDED" });
  assert.equal(viewIndex(chain(10, true)).length, 10);
  assert.throws(() => viewIndex(chain(11, true)), { message: "VIEW_EXPANSION_LIMIT_EXCEEDED" });
});

test("Raw input budgets reject before recursive normalization can exhaust the stack", () => {
  let nested: object = {};
  for (let i = 0; i < 10_000; i++) nested = { child: nested };
  reject({ ...valid, unknown: nested }, "VIEW_INPUT_DEPTH_EXCEEDED");
  reject({ ...valid, unknown: Array.from({ length: 17_000 }, () => null) }, "VIEW_INPUT_LIMIT_EXCEEDED");
});

test("Exported View schemas cannot be mutated to admit overrides or freeze legacy owners", () => {
  const assertFrozen = (value: unknown): void => {
    if (typeof value !== "object" || value === null) return;
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) assertFrozen(child);
  };
  for (const [name, schema] of Object.entries(viewSchemas)) {
    if (name.endsWith("Schema")) assertFrozen(schema);
  }
  assert.equal(Reflect.set(ViewSchema, "additionalProperties", true), false);
  for (const node of ViewSchema.properties.content.items.anyOf) {
    assert.equal(Reflect.set(node, "additionalProperties", true), false);
  }
  assert.equal(Object.isFrozen(TagNodeSchema), false, "View must clone, not seize a legacy owner's schema");
  const tagSchema = ViewSchema.properties.content.items.anyOf.find(node => node.properties.kind.const === "tag");
  assert.notEqual(tagSchema, TagNodeSchema);
  reject({ ...valid, style: "padding:0" });
  reject({ ...valid, content: [{ ...tag, style: "padding:0" }] });
  assert.deepEqual(view(valid), valid);
});
