import assert from "node:assert/strict";
import test from "node:test";
import { activePanel, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";
import { assertEdge, edgeState, paint, saveEdgeEvidence, scrollTo, usableControl } from "./scroll-edge-fixture.ts";

// Written independently before implementation. A floating toolbar's content edge
// uses the same progressive shadow at both edges, without any blur, is inert and accessible, and stays
// local to its scrolling surface. No
// toolbar means no invented edge. Framed start/end boundaries reveal all content.
// Run against separately hosted frozen baseline and candidate builds; preserve RED.
test("normal workspace edge follows the rendered toolbar and responsive scroll boundaries", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const cdp = await f.context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] });
    await openCatalog(page);
    const scope = page.locator("[data-catalog-content]"), content = scope.locator("[data-catalog-scroll]");
    const search = scope.locator("[data-catalog-toolbar]").getByRole("button", { name: "Search", exact: true });
    async function checkSearchFocus() {
      const retained = await content.evaluate(node => node.scrollTop);
      await usableControl(search, true); await page.keyboard.press("Enter");
      await scope.getByRole("searchbox").waitFor(); await page.keyboard.press("Escape"); await settle(page);
      assert.equal(await content.evaluate(node => node.scrollTop), retained,
        "toolbar focus inspection and search cancellation preserve the measured background position");
    }
    await scrollTo(content, "middle");
    t.diagnostic(await saveEdgeEvidence(page, "catalog-dark-middle", scope));
    await assertEdge(scope, "top", true);
    assert.equal((await edgeState(scope)).filter(state => state.edge === "bottom").length, 0, "no footer means no bottom decoration");
    const band = await assertEdge(scope, "top", true), toolbar = (await scope.locator("[data-catalog-toolbar]").boundingBox())!;
    assert.ok(band.box.top <= toolbar.y && band.box.bottom > toolbar.y + toolbar.height,
      "top protection covers the toolbar and fades into the reading area");
    await checkSearchFocus();
    for (const width of [390, 1100]) {
      await page.setViewportSize({ width, height: 700 }); await paint(page);
      // Reflow changes the scroll range. Measure the new middle rather than
      // assuming the old pixel offset is still away from both boundaries.
      await scrollTo(content, "middle");
      const edge = width === 390 ? "bottom" : "top";
      assert.equal(await scope.locator("[data-catalog-toolbar]").getAttribute("data-toolbar"), edge);
      assert.deepEqual((await edgeState(scope)).map(state => state.edge), width === 390 ? ['top','bottom'] : ['top'],
        "compact places have a top navigation toolbar and a bottom search toolbar");
      const next = await assertEdge(scope, edge, true), bounds = (await scope.boundingBox())!;
      assert.ok(Math.abs(next.box.width - bounds.width) <= 2, "the band follows its pane after responsive resizing");
      const chrome = (await scope.locator("[data-catalog-toolbar]").boundingBox())!;
      assert.ok(edge === "bottom" ? next.box.top < chrome.y && next.box.bottom >= chrome.y + chrome.height
        : next.box.top <= chrome.y && next.box.bottom > chrome.y + chrome.height, "shading covers chrome and feathers toward content");
      await usableControl(search); await checkSearchFocus();
      await scrollTo(content, edge === "bottom" ? "end" : "start"); await assertEdge(scope, edge, false);
      await scrollTo(content, "middle"); await assertEdge(scope, edge, true);
      await saveEdgeEvidence(page, `catalog-${width}-middle`, scope);
    }
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    await paint(page); await assertEdge(scope, "top", true, true);
    await checkSearchFocus();
    await assertEdge(scope, "top", true, true); await saveEdgeEvidence(page, "catalog-reduced-transparency", scope);
    await page.getByRole('button', { name:'Notes', exact:true }).click(); await settle(page);
    await scrollTo(content, "start");
    await page.setViewportSize({ width: 1280, height: 2000 }); await paint(page);
    const dimensions = await content.evaluate(node => ({ height: node.clientHeight, scrollHeight: node.scrollHeight }));
    assert.ok(dimensions.scrollHeight <= dimensions.height + 1, "fixture has become nonoverflowing");
    await assertEdge(scope, "top", false, true);
  } finally { await f.close(); }
});

test("read-only diagnostic transient grows a local top edge without inventing footer chrome", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const cdp = await f.context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] });
    await openCatalog(page);
    await page.locator('[data-view-item="specimen:transient:open"]').getByRole("button").click();
    const dialog = page.getByRole("dialog", { name: "Diagnostic transient", exact: true });
    await dialog.waitFor(); await settle(page);
    const scope = dialog.locator("[data-surface-frame]"), content = scope.locator('[data-surface-slot="content"]');
    assert.equal(await scope.locator('[data-scroll-edge][data-active="true"]').count(), 0, "short content needs no boundary effect");
    // Isolated renderer stress only: read-only catalog data and APIs are untouched.
    await content.evaluate(node => {
      const prose = node.querySelector("p")!;
      prose.textContent = "A long diagnostic line makes the boundary observable. ".repeat(250);
    });
    await paint(page); await scrollTo(content, "middle");
    t.diagnostic(await saveEdgeEvidence(page, "public-transient-dark-middle", scope));
    await assertEdge(scope, "top", true);
    assert.equal((await edgeState(scope)).filter(edge => edge.edge === 'bottom').length, 0);
    await usableControl(scope.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }), true);
    const before = (await edgeState(scope)).map(edge => edge.active);
    await page.locator("[data-catalog-scroll]").evaluate(node => { node.scrollTop = 0; }); await paint(page);
    assert.deepEqual((await edgeState(scope)).map(edge => edge.active), before, "background pane scroll does not control the transient");
  } finally { await f.close(); }
});

test("transient top and bottom edges clear at boundaries, stay local, and preserve chrome", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  try {
    const { page } = f;
    await page.setViewportSize({width:1600,height:900});
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    const cdp = await f.context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] });
    await page.getByRole("button", { name: "Create note", exact: true }).click();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Scroll edge regression fixture");
    await page.getByRole("textbox", { name: "Content", exact: true }).fill("A complete readable line of review content.\n".repeat(60) + "Final visible line.");
    await activePanel(page).getByRole("button", { name: "Create note", exact: true }).click();
    const reading = activePanel(page);
    await waitForNote(page, 'Scroll edge regression fixture');
    const opener = reading.getByRole("button", { name: "Archive note", exact: true });
    await opener.click();
    const panel = activePanel(page), scope = panel.locator('[data-surface-frame]');
    await panel.locator('[data-toolbar-title]').getByText('Review · Archive note', {exact:true}).waitFor();
    await scope.waitFor(); await settleMotion(page);
    const content = scope.locator('[data-surface-slot="content"]');
    const back = scope.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Back", exact: true });
    const topBack = scope.locator('[data-surface-slot="top"]').getByRole("button", { name: "Back", exact: true });
    await scrollTo(content, "middle");
    t.diagnostic(await saveEdgeEvidence(page, "transient-light-middle", scope));
    const top = await assertEdge(scope, "top", true), bottom = await assertEdge(scope, "bottom", true);
    const header = (await scope.locator('[data-surface-slot="top"]').boundingBox())!;
    const footer = (await scope.locator('[data-surface-slot="bottom"]').boundingBox())!;
    assert.ok(top.box.top >= header.y + header.height - 1 && bottom.box.bottom <= footer.y + 1,
      "framed edge treatments do not paint over sharp toolbar labels and focus rings");
    await usableControl(topBack, true); await usableControl(back, true);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 568 }); await paint(page);
      await scrollTo(content, "start"); await assertEdge(scope, "top", false); await assertEdge(scope, "bottom", true);
      await scrollTo(content, "end"); await assertEdge(scope, "top", true); await assertEdge(scope, "bottom", false);
      const lastLine = await content.locator(".fact-value").filter({ hasText: "Final visible line." }).evaluate(node => {
        const range = document.createRange();
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let text: Node | null = null;
        for (let next = walker.nextNode(); next; next = walker.nextNode()) {
          if (next.textContent?.trim()) text = next;
        }
        if (!text) throw new Error("Expected the final readable content text");
        const length = text.textContent!.trimEnd().length;
        range.setStart(text, length - 1); range.setEnd(text, length);
        const glyph = range.getBoundingClientRect(), viewport = node.closest('[data-surface-slot="content"]')!.getBoundingClientRect();
        return { top: glyph.top, bottom: glyph.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom };
      });
      assert.ok(lastLine.top >= lastLine.viewportTop && lastLine.bottom <= lastLine.viewportBottom,
        "the final content remains readable above the bottom controls");
      await usableControl(topBack); await usableControl(back);
      await saveEdgeEvidence(page, `transient-${width}-end`, scope);
    }
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    await scrollTo(content, "middle");
    await assertEdge(scope, "top", true, true); await assertEdge(scope, "bottom", true, true);
    await saveEdgeEvidence(page, "transient-reduced-transparency", scope);
    const before = await edgeState(scope);
    await page.evaluate(() => window.scrollTo(0, 0)); await paint(page);
    assert.deepEqual((await edgeState(scope)).map(edge => edge.active), before.map(edge => edge.active), "background scrolling cannot change modal edges");
    // Deliberate isolated DOM stress: exercise dynamic shrink without a new scroll
    // event. This is renderer-observer evidence, not a product editing workflow.
    await scrollTo(content, "start"); await assertEdge(scope, "bottom", true, true);
    await content.evaluate(node => { for (const child of node.children) (child as HTMLElement).style.display = "none"; });
    await paint(page);
    await assertEdge(scope, "top", false, true); await assertEdge(scope, "bottom", false, true);
    await back.click(); await waitForNote(page, 'Scroll edge regression fixture');
    assert.equal(await opener.evaluate(node => node === document.activeElement), true,
      `dismissal restores original control focus; ${JSON.stringify(await page.evaluate(() => ({
        active: { tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute('role'),
          label: document.activeElement?.getAttribute('aria-label') },
        targets: [...document.querySelectorAll('[data-toolbar-command]')].map(node => node.getAttribute('data-toolbar-command')),
      })))}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("decorative edges cannot enlarge the document during a container resize", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 390, height: 740 });
    await openCatalog(page);
    const catalog = page.locator("[data-catalog-content]");
    // Hold the old container size while resizing the viewport, then release it
    // synchronously. This exposes the pre-observer layout without a timing race.
    await catalog.evaluate(node => { node.style.width = "390px"; }); await paint(page);
    assert.ok(await catalog.locator("[data-scroll-edge]").count() > 0);
    await page.setViewportSize({ width: 320, height: 740 });
    const geometry = await catalog.evaluate(node => {
      node.style.width = "320px";
      return { width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        catalogWidth: node.getBoundingClientRect().width };
    });
    t.diagnostic(JSON.stringify(geometry));
    assert.equal(geometry.catalogWidth, 320, "the content container actually shrank");
    assert.ok(geometry.documentWidth <= geometry.width,
      "decorative geometry must not create overflow while its observer catches up");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
