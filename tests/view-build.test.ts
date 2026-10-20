import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { program } from "./fixtures/view-program.ts";

test("the web module embeds the validated View program alongside canonical validation", async () => {
  const source = await buildHumanModule(compile(Notebook), "human", program);
  const built = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.deepEqual(built.viewProgram, program);
  assert.ok(Object.isFrozen(built.viewProgram.views));
  assert.equal(typeof built.validateInput, "function");
});

test("unsupported View programs fail before a web module can be built", async () => {
  await assert.rejects(buildHumanModule(compile(Notebook), "human", { ...program, style: {} }),
    /INVALID_VIEW_PROGRAM/);
});
