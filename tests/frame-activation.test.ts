// The nonvisual half of frame continuity (design §5): a main-view action enters a retained panel once. The action records
// the frame it leaves; the frame that replaces it claims the activation exactly once; an unclaimed one expires after the
// update. Where focus was and whether it moved away belong to an observing foundation, so the module holds no element.
import assert from "node:assert/strict";
import test from "node:test";
import { tick } from "svelte";
import { frameActivation } from "../src/svelte/infra/frame-activation.ts";
import { renderServer } from "./fixtures/svelte-server.ts";

test("an activation is claimed once, by the frame change away from the frame it left", () => {
  const activation = frameActivation(), invoked: string[] = [];
  activation.activate("owner-1", () => invoked.push("open"));
  assert.deepEqual(invoked, ["open"]);
  assert.equal(activation.take("owner-2", "owner-3"), undefined, "a change from another frame does not claim it");
  assert.equal(activation.take("owner-1", "owner-1"), undefined, "no change of frame does not claim it");
  const claim = activation.take("owner-1", "owner-2");
  assert.ok(claim);
  assert.equal(claim.current(), true);
  assert.equal(activation.take("owner-1", "owner-2"), undefined, "a later observation cannot claim it again");
  claim.finish();
  assert.equal(claim.current(), false);
});

test("an unclaimed activation expires after the update; a new one replaces the pending one", async () => {
  const activation = frameActivation();
  activation.activate("owner-1", () => {});
  await tick();
  assert.equal(activation.take("owner-1", "owner-2"), undefined, "expired");
  activation.activate("owner-1", () => {});
  const first = activation.take("owner-1", "owner-2");
  activation.activate("owner-2", () => {});
  assert.equal(first?.current(), false, "replaced by the next activation");
  assert.ok(activation.take("owner-2", "owner-3"));
});

test("an activation whose action throws is cleared and the error propagates", () => {
  const activation = frameActivation();
  assert.throws(() => activation.activate("owner-1", () => { throw new Error("ACTION_FAILED"); }), /^Error: ACTION_FAILED$/);
  assert.equal(activation.take("owner-1", "owner-2"), undefined);
});

test("observers see each activation start, may cancel it, and are released whenever it ends", async () => {
  const activation = frameActivation(), log: string[] = [];
  let cancel = () => {};
  const stop = activation.observe(start => {
    log.push(`start ${start.previous} ${start.id}`);
    cancel = start.cancel;
    return () => log.push(`end ${start.id}`);
  });
  activation.activate("owner-1", () => {});
  const [started] = log;
  const id = started?.split(" ")[2] ?? "";
  assert.match(id, /^activation-\d+$/);
  cancel();
  assert.equal(activation.take("owner-1", "owner-2"), undefined, "an observer's cancel (focus moved away) clears it");
  activation.activate("owner-1", () => {});
  activation.take("owner-1", "owner-2")?.finish();
  activation.activate("owner-2", () => {});
  activation.dispose();
  stop();
  activation.activate("owner-3", () => {});
  await tick();
  assert.equal(log.filter(line => line.startsWith("start")).length, 3, "a stopped observer sees no further activation");
  assert.equal(log.filter(line => line.startsWith("end")).length, 3, "cancel, finish and dispose each released the observer once");
});

test("context: the activation a workspace provides is the one its panels use", async () => {
  const body = await renderServer(`<script lang="ts">
  import Child from "./Child.svelte";
  import { provideFrameActivation } from "@desert/svelte/infra/frame-activation.ts";
  globalThis.providedActivation = provideFrameActivation();
</script><Child />`, { "Child.svelte": `<script lang="ts">
  import { useFrameActivation } from "@desert/svelte/infra/frame-activation.ts";
  const activation = useFrameActivation();
</script><p>{activation === globalThis.providedActivation ? "same" : "other"}</p>` });
  assert.match(body, /<p>same<\/p>/);
});
