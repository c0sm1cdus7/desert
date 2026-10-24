// The nonvisual ports of design §3.1 and §5: the disclosure a trigger carries as data, the system colour scheme
// AppearanceRoot publishes, and the file host that travels by context instead of through contracts.
import assert from "node:assert/strict";
import test from "node:test";
import { Value } from "@sinclair/typebox/value";
import { get } from "svelte/store";
import { publishSystemScheme, systemScheme } from "../src/svelte/infra/appearance-store.ts";
import { DisclosureSchema } from "../src/svelte/infra/disclosure.ts";
import { renderServer } from "./fixtures/svelte-server.ts";

test("disclosure: a closed record of trigger id, controlled surface, expanded state and popup kind", () => {
  const disclosure = { id: "labels-trigger", controls: "labels-surface", expanded: true, haspopup: "dialog" };
  assert.equal(Value.Check(DisclosureSchema, disclosure), true);
  for (const haspopup of ["menu", "listbox"]) assert.equal(Value.Check(DisclosureSchema, { ...disclosure, haspopup }), true, haspopup);
  const invalid: readonly unknown[] = [{ ...disclosure, haspopup: "tree" }, { ...disclosure, expanded: "true" },
    { ...disclosure, onclick: "toggle" }, { id: "labels-trigger", controls: "labels-surface", expanded: false }];
  for (const value of invalid) assert.equal(Value.Check(DisclosureSchema, value), false, JSON.stringify(value));
});

test("system scheme: light until AppearanceRoot publishes; subscribers see each published scheme; readers cannot write it", () => {
  assert.equal(get(systemScheme), "light");
  const seen: string[] = [];
  const stop = systemScheme.subscribe(value => seen.push(value));
  publishSystemScheme("dark");
  publishSystemScheme("light");
  stop();
  assert.deepEqual(seen, ["light", "dark", "light"]);
  assert.deepEqual(Object.keys(systemScheme), ["subscribe"], "the readable exposes no setter");
});

test("file host context: the host a product subtree provides is the one its controls use; without one there is none", async () => {
  const body = await renderServer(`<script lang="ts">
  import Child from "./Child.svelte";
  import { provideFileHost } from "@desert/svelte/infra/file-host-context.ts";
  const host = provideFileHost();
  globalThis.providedFileHost = host;
</script><Child />`, { "Child.svelte": `<script lang="ts">
  import { useFileHost } from "@desert/svelte/infra/file-host-context.ts";
  const host = useFileHost();
</script><p>{host === globalThis.providedFileHost ? "same-host" : "other-host"}</p>` });
  assert.match(body, /<p>same-host<\/p>/);
  const bare = await renderServer(`<script lang="ts">
  import { useFileHost } from "@desert/svelte/infra/file-host-context.ts";
</script><p>{useFileHost() === undefined ? "no-host" : "host"}</p>`);
  assert.match(bare, /<p>no-host<\/p>/);
});
