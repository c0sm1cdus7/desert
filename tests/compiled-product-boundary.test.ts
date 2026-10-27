import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, composeProduct } from "../src/index.ts";
import { compile as compileContract } from "../src/compile.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { openControllerHost } from "../src/local/controller-host.ts";
import { testInstallation } from "../src/testing/installation.ts";

test("public compilation consumes the admitted composition, never a detached domain or copy", () => {
  const product = composeProduct(authoredNotebookSource());
  assert.equal(compile(product).id, product.definition.id);
  assert.equal(compile(product), compile(product));
  assert.throws(() => Reflect.apply(compile, undefined, [product.definition]), /COMPOSED_PRODUCT_REQUIRED/);
  assert.throws(() => Reflect.apply(compile, undefined, [{ ...product }]), /COMPOSED_PRODUCT_REQUIRED/);
  assert.throws(() => Reflect.apply(compile, undefined, [JSON.parse(JSON.stringify(product))]), /COMPOSED_PRODUCT_REQUIRED/);
});

test("controller hosts reject detached or overridden programs before creating storage", async () => {
  const product = composeProduct(authoredNotebookSource());
  const temporary = mkdtempSync(join(tmpdir(), "desert-host-admission-"));
  const directory = join(temporary, "controller");
  try {
    const options = { application: compile(product), roles: ["notes"], installation: testInstallation, surfaceId: "human", directory };
    await assert.rejects(Reflect.apply(openControllerHost, undefined,
      [{ ...options, viewProgram: product.viewProgram }]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
    await assert.rejects(Reflect.apply(openControllerHost, undefined,
      [{ ...options, viewProgram: undefined }]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
    await assert.rejects(openControllerHost({ ...options, application: compileContract(product.definition) }),
      /COMPOSED_PRODUCT_REQUIRED/);
    assert.equal(existsSync(directory), false);
  } finally { rmSync(temporary, { recursive: true }); }
});

test("human builds derive their single View program from the compiled composition", async () => {
  const product = composeProduct(authoredNotebookSource());
  const code = await buildHumanModule(compile(product), "human");
  assert.match(code, /viewProgram/);
  assert.match(code, /desert.view-program/);
  await assert.rejects(buildHumanModule(compileContract(product.definition), "human"), /COMPOSED_PRODUCT_REQUIRED/);
  await assert.rejects(Reflect.apply(buildHumanModule, undefined,
    [compile(product), "human", product.viewProgram]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
});
