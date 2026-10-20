import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { compile } from "../../src/compile.ts";
import { buildDistribution } from "../../src/build/index.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";
import { openLocalController } from "../../src/local.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { NotebookService, NotebookWeb } from "../../products/notebook/distributions.ts";
import { postgresCluster } from "../fixtures/postgres.ts";
import type { ProductDefinition } from "../../src/contracts.ts";

test("empty allowed text submits and review shows an authorized effect absent from detail", { timeout: 90000 }, async () => {
  const definition: ProductDefinition = structuredClone(Notebook);
  definition.objects[0]!.facts.title = { kind: "text", minLength: 0 };
  definition.objects[0]!.facts.privateFact = { kind: "text" };
  const create = definition.journeys!.find(journey => journey.id === "create-note")!;
  assert.equal(create.kind, "mutation");
  assert.equal(create.command.kind, "create");
  create.command.values.privateFact = { kind: "literal", value: "unexposed-private-value" };
  const read = definition.journeys!.find(journey => journey.id === "read-note")!;
  assert.equal(read.kind, "read");
  read.fields = ["title", "body"];
  const directory = mkdtempSync(join(tmpdir(), "desert-review-empty-"));
  const cluster = postgresCluster();
  try {
    const application = compile(definition);
    await buildDistribution(application, { distributions: [NotebookService, NotebookWeb],
      target: NotebookWeb.id, outputDirectory: join(directory, "web") });
    const controller = await openLocalController(application, { ...await cluster.database(), role: "notes" });
    const actor = await controller.identities.issue("Review test owner");
    const session = controller.connect(actor.token, "human");
    const server = await serveBuiltLocalSurface({ buildDirectory: join(directory, "web"), session, port: 0 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(8000);
      await page.goto(server.launchUrl);
      await page.getByText("Local controller ready", { exact: true }).waitFor();
      for (const body of ["First empty-title note", "Second empty-title note"]) {
        await page.getByRole("button", { name: "Create note", exact: true }).first().click();
        const title = page.getByRole("textbox", { name: "Title", exact: true });
        assert.equal(await title.inputValue(), "");
        assert.equal(await title.getAttribute("required"), null);
        await page.getByRole("textbox", { name: "Content", exact: true }).fill(body);
        await page.locator("form").getByRole("button", { name: "Create note", exact: true }).click();
        const context = page.getByRole("region", { name: "Object context", exact: true });
        await context.waitFor().catch(error => { assert.deepEqual(errors, []); throw error; });
        assert.equal(await context.getByText("Status", { exact: true }).count(), 0);
        await context.getByRole("button", { name: "Archive note", exact: true }).click();
        const review = page.getByRole("region", { name: "Journey", exact: true });
        await review.getByText("Status", { exact: true }).waitFor();
        await review.getByText("archived", { exact: true }).waitFor();
        assert.equal(await review.getByText(body, { exact: true }).count(), 1);
        assert.equal(await review.getByText("unexposed-private-value", { exact: true }).count(), 0);
        const before = await session.read((await session.begin("read-note")).id);
        assert.equal(before.filter(record => record.facts.state === "active").length, 1);
        await review.getByRole("button", { name: "Archive note", exact: true }).click();
        await context.waitFor();
        const after = await session.read((await session.begin("read-note")).id);
        assert.equal(after.every(record => record.facts.title === "" && record.facts.state === "archived"), true);
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await context.locator('[data-surface-slot="top"]').getByRole("button", { name: "Back", exact: true }).click();
        await context.waitFor({ state: "hidden" });
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); await server.close(); await controller.close(); }
  } finally { cluster.dispose(); rmSync(directory, { recursive: true }); }
});
