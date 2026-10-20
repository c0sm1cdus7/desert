import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, card, navigationAction, readOnlyRequests, search, settle } from "./public-catalog-expectations.ts";

test("public home exposes the installed navigation and native-reference landmark order", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    const readonly = readOnlyRequests(page);
    await page.reload();
    await page.getByRole("heading", { name: "Mount Fuji", exact: true }).waitFor();
    await navigationAction(page, "Landmarks");
    for (const name of ["Landmarks", "Travel kit", "Component bank"]) assert.ok(await action(page, name).isVisible());
    assert.equal(await action(page, "Map").count(), 0, "Do not pretend the native map is installed");
    assert.equal(await action(page, "Collections").count(), 0, "Do not pretend native collections are installed");
    await page.keyboard.press("Escape");
    await page.locator('[data-slot="sidebar"][data-presentation="overlay"]').waitFor({ state: "hidden" });
    assert.ok(await page.getByRole("heading", { name: "Asia", exact: true }).isVisible());
    assert.ok(await page.getByRole("heading", { name: "Africa", exact: true }).count());
    const asia = await Promise.all(["Mount Fuji", "Wulingyuan", "Mount Everest"].map(async name => ({
      name, box: await card(page, name).boundingBox(),
    })));
    assert.ok(asia.every(item => item.box));
    assert.ok(asia[0]!.box!.x < asia[1]!.box!.x && asia[1]!.box!.x < asia[2]!.box!.x);
    readonly();
  } finally { await fixture.close(); }
});

test("home hero and card open the same public detail, and Back restores the origin", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    const readonly = readOnlyRequests(page);
    for (const opener of [action(page, "Learn More"), card(page, "Mount Fuji")]) {
      await opener.click();
      await action(page, "Back").waitFor();
      assert.ok(await page.getByRole("heading", { name: "Mount Fuji", exact: true }).isVisible());
      assert.ok((await page.getByRole("main").innerText()).length > 200, "Detail must contain reading content, not only a title");
      await action(page, "Back").click();
      await opener.waitFor();
      assert.ok(await opener.evaluate(element => element === document.activeElement), "Back restores keyboard focus to its actual opener");
    }
    readonly();
  } finally { await fixture.close(); }
});

test("public search matches all terms case-insensitively and retains its query through detail", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    const readonly = readOnlyRequests(page);
    const input = await search(page);
    await input.fill("ASIA 1707");
    await card(page, "Mount Fuji").waitFor();
    await card(page, "Wulingyuan").waitFor({ state: "hidden" });
    assert.ok(await card(page, "Mount Fuji").isVisible(), "Exposed description is searchable; 1707 is Fuji's eruption year, absent from its title");
    await input.fill("ASIA fuJI");
    await card(page, "Mount Fuji").waitFor();
    await card(page, "Wulingyuan").waitFor({ state: "hidden" });
    assert.equal(await card(page, "Wulingyuan").count(), 0);
    assert.equal(await card(page, "Mount Everest").count(), 0);
    await card(page, "Mount Fuji").click();
    await action(page, "Back").click();
    assert.equal(await (await search(page)).inputValue(), "ASIA fuJI");
    assert.ok(await card(page, "Mount Fuji").isVisible());
    await (await search(page)).fill("fuji impossible-unmatched-term");
    await card(page, "Mount Fuji").waitFor({ state: "hidden" });
    assert.equal(await card(page, "Mount Fuji").count(), 0, "All terms must match; not any term");
    assert.ok(await page.getByText(/no (matching|results)/i).isVisible(), "Empty results need explicit feedback");
    await (await search(page)).fill("1016");
    assert.equal(await card(page, "Mount Fuji").count(), 0, "Internal identity is not an exposed search field");
    await (await search(page)).fill("");
    await page.getByRole("heading", { name: "Search in Landmarks", exact: true }).waitFor();
    await page.getByRole("button", { name: /^(Close|Cancel) search$/ }).click();
    await card(page, "Wulingyuan").waitFor();
    readonly();
  } finally { await fixture.close(); }
});

test("keyboard activates navigation and detail without a mouse, with visible focus", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    const readonly = readOnlyRequests(page);
    const opener = card(page, "Mount Fuji");
    await opener.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    assert.ok(await opener.evaluate(element => element.matches(":focus-visible")));
    await page.keyboard.press("Enter");
    await action(page, "Back").waitFor();
    await settle(page);
    assert.ok(await page.getByRole("main").evaluate(element => element.contains(document.activeElement)), "Detail owns keyboard focus after navigation");
    await action(page, "Back").focus();
    await page.keyboard.press("Enter");
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    await (await navigationAction(page, "Travel kit", true)).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Travel kit", exact: true }).waitFor();
    assert.match(await page.getByRole("main").innerText(), /local|draft/i, "The kit must identify its non-business draft scope");
    assert.equal(await page.getByRole("status").filter({ hasText: /^(Saved|Accepted|Completed)$/i }).count(), 0,
      "No unqualified product-acceptance claim may be fabricated by a local-draft surface");
    await (await navigationAction(page, "Component bank", true)).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Component bank", exact: true }).waitFor();
    readonly();
  } finally { await fixture.close(); }
});

test("landmark search covers detail, shows matching results and keeps writing focus", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await action(page, "Learn More").click();
    await action(page, "Back").waitFor();
    const input = await search(page);
    await input.fill("Wulingyuan");
    await card(page, "Wulingyuan").waitFor();
    await action(page, "Back").waitFor({ state: "hidden" });
    assert.ok(await input.evaluate(element => element === document.activeElement), "Search navigation must not steal typing focus");
    assert.equal(await card(page, "Mount Fuji").count(), 0);
    await card(page, "Wulingyuan").click();
    await page.getByRole("heading", { name: "Wulingyuan", exact: true }).waitFor();
    await action(page, "Back").click();
    assert.equal(await (await search(page)).inputValue(), "Wulingyuan");
  } finally { await fixture.close(); }
});
