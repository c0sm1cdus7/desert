import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { openLocalController } from "../src/local/controller.ts";
import { requireControllerBinding } from "../src/local/controller-binding.ts";
import { serveIdentitySurface } from "../src/web/server.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("identity host binding is genuine and needs no synthetic identity before onboarding", async () => {
  const cluster = postgresCluster(), application = compile(Notebook);
  const controller = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  const server = await serveIdentitySurface(controller, "human", (_request, response) => response.end("test"), 0);
  try {
    assert.equal(requireControllerBinding(controller).application, application);
    assert.throws(() => requireControllerBinding({ ...controller }), /UNTRUSTED_LOCAL_CONTROLLER/);
    await assert.rejects(serveIdentitySurface(controller, "agent", () => {}, 0), /HUMAN_SURFACE_REQUIRED/);
    assert.deepEqual(await (await fetch(`${server.origin}/api/accessState`)).json(), { kind: "onboarding" });
    assert.equal((await fetch(`${server.origin}/api/availability`)).status, 401);
  } finally { await server.close(); await controller.close(); cluster.dispose(); }
});
