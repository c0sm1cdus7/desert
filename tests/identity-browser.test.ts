import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir } from "node:fs/promises";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { serveIdentitySurface } from "../src/web/server.ts";
import { ViewNotebook } from "./fixtures/view-exposure.ts";
import { program } from "./fixtures/view-program.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { workspaceCss } from "./fixtures/workspace-css.ts";

test("real browser gates private workspace, initializes one admin, locks and signs in with the same persisted identity", async () => {
  const cluster = postgresCluster(), application = compile(ViewNotebook);
  const controller = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  const server = await serveIdentitySurface(controller, "human", (_request, response) => response.end("fixture"), 0);
  const identityView = { version: "desert.view/1", id: "identity", outputs: ["lock"],
    topDock: { kind: "toolbar", actions: [{ output: "lock", label: "Lock", icon: "lock" }] },
    content: [{ kind: "header", id: "heading", title: "Identity" }, { kind: "identity", id: "identity" }] };
  const viewProgram = { ...program, views: [...program.views, identityView],
    journeys: [...program.journeys, { id: "identity", kind: "presentation", view: "identity", outputs: [
      { view: "identity", output: "lock", action: { kind: "lock" } }] }],
    destinations: [...program.destinations, { id: "identity", label: "Identity", icon: "lock", entryJourney: "identity" }],
    navigation: [...program.navigation, { destination: "identity", group: "Settings", purpose: "content" }],
  };
  let browser: Awaited<ReturnType<typeof svelteBrowser>> | undefined;
  try {
    browser = await svelteBrowser(`<script>
      import AccessGate from '@desert/svelte/catalog/compositions/access-gate/AccessGate.svelte';
      history.replaceState(null, '', ${JSON.stringify(new URL(server.launchUrl).hash)});
      const surface = ${JSON.stringify(application.surface("human"))};
      const viewProgram = ${JSON.stringify(viewProgram)};
      let generation = $state(0);
      window.restartAccessGate = () => { generation++; };
    </script>{#key generation}<AccessGate {surface} {viewProgram} validateInput={() => true} />{/key}`, {}, `${server.origin}/`);
    const { page } = browser;
    await page.addStyleTag({ content: await workspaceCss() });
    await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
    await mkdir("artifacts/identity-access", { recursive: true });
    await page.screenshot({ path: "artifacts/identity-access/onboarding-wide.png", animations: "disabled" });
    assert.equal(await page.getByRole("button", { name: "Notes", exact: true }).count(), 0);
    assert.equal(await page.locator('[data-workspace]').count(), 0);
    await page.getByLabel("Display name", { exact: true }).fill("Test Administrator");
    await page.getByLabel("Identity name", { exact: true }).fill("administrator");
    await page.getByLabel("Password", { exact: true }).fill("an ephemeral test password");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Get started", exact: true }).click();
    await page.getByRole("button", { name: "Identity", exact: true }).click();
    await page.getByText("Test Administrator", { exact: true }).waitFor();
    const identity = await page.evaluate(async () => (await (await fetch("/api/accessState")).json()).identity.id);
    assert.equal(await page.getByRole("button", { name: "Create identity", exact: true }).count(), 0,
      "post-login administration is not an alternate command execution path");
    await page.getByRole("button", { name: "Lock", exact: true }).click();
    await page.getByRole("button", { name: "Unlock", exact: true }).waitFor();
    assert.equal(await page.locator('[data-workspace]').count(), 0);
    assert.equal(await page.getByRole("heading", { name: "Test Administrator", exact: true }).count(), 1,
      "the remembered display name is presentation data, not an unlocked workspace");
    assert.equal(await page.getByRole("button", { name: "Notes", exact: true }).count(), 0);
    assert.equal(await page.evaluate(async () => (await fetch("/api/availability")).status), 401);
    await page.getByRole("button", { name: "Use another identity", exact: true }).click();
    await page.getByLabel("Identity name", { exact: true }).fill("administrator");
    await page.getByLabel("Password", { exact: true }).fill("wrong password");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await page.getByText(/Check your identity name and password/).waitFor();
    assert.equal(await page.getByLabel("Password", { exact: true }).inputValue(), "");
    assert.equal(await page.getByRole("button", { name: "Notes", exact: true }).count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: "artifacts/identity-access/locked-compact.png", animations: "disabled" });
    await page.getByLabel("Password", { exact: true }).fill("an ephemeral test password");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await page.getByRole("button", { name: "Unlock", exact: true }).waitFor({ state: "detached" });
    assert.equal(await page.evaluate(async () => (await (await fetch("/api/accessState")).json()).identity.id), identity);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Identity", exact: true }).click();
    await page.route(`${server.origin}/api/lock`, route => route.abort());
    await page.getByRole("button", { name: "Lock", exact: true }).click();
    await page.getByText(/Could not confirm revocation/).waitFor();
    assert.equal(await page.evaluate(async () => (await (await fetch("/api/accessState")).json()).kind), "ready",
      "offline witness leaves the server cookie valid; the local lock must still survive recreation");
    await page.evaluate(() => (window as unknown as { restartAccessGate(): void }).restartAccessGate());
    await page.getByRole("button", { name: "Unlock", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Notes", exact: true }).count(), 0);
    await page.unroute(`${server.origin}/api/lock`);
    await page.getByRole("button", { name: "Use another identity", exact: true }).click();
    await page.getByLabel("Identity name", { exact: true }).fill("administrator");
    await page.getByLabel("Password", { exact: true }).fill("an ephemeral test password");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await page.getByRole("button", { name: "Identity", exact: true }).waitFor();
    const secondTab = await page.context().newPage();
    await secondTab.goto(server.origin);
    await secondTab.evaluate(() => localStorage.setItem("desert.session-lock/1", "locked"));
    await page.getByRole("button", { name: "Unlock", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Notes", exact: true }).count(), 0,
      "a real cross-tab storage event removes the already mounted workspace");
    await secondTab.close();
    assert.deepEqual(browser.errors, []);
  } finally { await browser?.close(); await server.close(); await controller.close(); cluster.dispose(); }
});
