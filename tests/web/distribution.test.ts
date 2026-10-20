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
import type { DistributionDefinition } from "../../src/distributions.ts";

test("a renamed product can invoke a journey named accept and review it without renderer-operation collisions", { timeout: 90000 }, async () => {
  const rename = (value: unknown) => JSON.parse(JSON.stringify(value)
    .replaceAll('"create-note"', '"accept"')
    .replace(/\b(notebook|note|notes|title|body|state|owner)\b/g, value => "renamed_" + value));
  const product: ProductDefinition = rename(Notebook);
  const distributions: DistributionDefinition[] = rename([NotebookService, NotebookWeb]);
  const surface = product.surfaces!.find(surface => surface.kind === "human")!;
  assert.equal(surface.kind, "human");
  const createId = surface.primaryAction;
  assert.equal(createId, "accept", "an authored journey may use the same word as a renderer operation");
  surface.commit[createId] = "review";
  const directory = mkdtempSync(join(tmpdir(), "desert-browser-build-"));
  const cluster = postgresCluster();
  try {
    const application = compile(product);
    const target = distributions.find(item => item.kind === "client")!;
    await buildDistribution(application, { distributions, target: target.id, outputDirectory: join(directory, "web") });
    const read = product.journeys!.find(journey => journey.id === surface.entry)!;
    const controller = await openLocalController(application, { ...await cluster.database(), role: read.requires.controller });
    const actor = await controller.identities.issue("Renamed owner");
    const session = controller.connect(actor.token, surface.id);
    const server = await serveBuiltLocalSurface({ buildDirectory: join(directory, "web"), session, port: 0 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(8000);
      await page.goto(server.launchUrl);
      await page.getByText("Local controller ready", { exact: true }).waitFor();
      await page.getByRole("button", { name: surface.language.journeys[createId]!, exact: true }).first().click();
      await page.getByRole("textbox", { name: "Title", exact: true }).fill("Renamed product");
      await page.getByRole("textbox", { name: "Content", exact: true }).fill("Same renderer, different contract.");
      await page.locator("form").getByRole("button", { name: "Review", exact: true }).click();
      await page.getByRole("heading", { name: "Review · " + surface.language.journeys[createId], exact: true }).waitFor();
      assert.deepEqual(await session.read((await session.begin(read.id)).id), []);
      await page.getByRole("region", { name: "Journey", exact: true })
        .getByRole("button", { name: surface.language.journeys[createId]!, exact: true }).click();
      await page.getByRole("region", { name: "Object context", exact: true }).waitFor();
      const records = await session.read((await session.begin(read.id)).id);
      assert.equal(records.length, 1);
      assert.equal(records[0]!.facts.renamed_title, "Renamed product");
      assert.deepEqual(errors, []);
    } finally { await browser.close(); await server.close(); await controller.close(); }
  } finally { cluster.dispose(); rmSync(directory, { recursive: true }); }
});
