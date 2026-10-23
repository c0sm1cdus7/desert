import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator } from "playwright";
import { activePanel, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

const title = "Independent review: Field observations from the northern route, including road access, seasonal changes, " +
  "conversations with local residents, proposed follow-up visits, equipment needs, and the remaining questions for next planning day";
const body = `${"Complete field observations remain readable in the scrolling body.\n".repeat(25)}Final retained paragraph.`;

async function reachableChrome(dialog: Locator, evidencePath: string) {
  const geometry = await dialog.evaluate(node => {
    const rect = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().toJSON();
    const content = node.querySelector<HTMLElement>('[data-surface-slot="content"]')!;
    const bodyStyle = getComputedStyle(content);
    const verticalPadding = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
    return { dialog: node.getBoundingClientRect().toJSON(), header: rect('[data-surface-slot="top"]'),
      footer: rect('[data-surface-slot="bottom"]'), content: content.getBoundingClientRect().toJSON(),
      scrollHeight: content.scrollHeight, clientHeight: content.clientHeight,
      verticalPadding, usableBodyHeight: content.clientHeight - verticalPadding, bodyLineHeight: parseFloat(bodyStyle.lineHeight),
      labels: [...node.querySelectorAll('[data-surface-slot="top"] h2,[data-surface-slot="top"] p,[data-surface-slot="top"] [role="status"] > span')].map(label => ({
        height: label.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(label).lineHeight),
        clamp: getComputedStyle(label).webkitLineClamp, display: getComputedStyle(label).display,
      })) };
  });
  await writeFile(`${evidencePath}.json`, JSON.stringify(geometry, null, 2));
  await dialog.page().screenshot({ path: `${evidencePath}.png` });
  assert.ok(geometry.header.height < geometry.dialog.height / 2, "chrome cannot consume the reading area");
  assert.ok(geometry.usableBodyHeight >= geometry.bodyLineHeight * 2,
    "after subtracting padding, the body retains at least two enlarged lines of reading space");
  assert.ok(geometry.footer.y >= geometry.content.y + geometry.content.height - 1);
  assert.ok(geometry.footer.y + geometry.footer.height <= geometry.dialog.y + geometry.dialog.height + 1,
    "footer remains within the visible dialog rather than below its clipping edge");
  assert.ok(geometry.labels.every(label => label.height <= label.lineHeight * 2 + 1), "title and subtitle are bounded, not unbounded prose");
  return geometry;
}

async function readableText(value: Locator, end = false) {
  const visibility = await value.evaluate((node, last) => {
    const header = node.closest<HTMLElement>('[data-surface-slot="top"]');
    const content = node.closest<HTMLElement>('[data-surface-slot="content"]');
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const texts: Node[] = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (text.textContent?.length) texts.push(text);
    }
    const text = last ? texts.at(-1)! : texts[0]!;
    const range = document.createRange();
    const offset = last ? (text.textContent?.length ?? 1) - 1 : 0;
    range.setStart(text, offset); range.setEnd(text, offset + 1);
    const viewport = (header ?? content)!.getBoundingClientRect();
    if (!header) content!.scrollTop += range.getBoundingClientRect().top - viewport.top - parseFloat(getComputedStyle(content!).paddingTop);
    const glyph = range.getBoundingClientRect();
    const hit = document.elementFromPoint(glyph.x + glyph.width / 2, glyph.y + glyph.height / 2);
    return { glyph: glyph.toJSON(), viewport: viewport.toJSON(), unobscured: node === hit || node.contains(hit) };
  }, end);
  assert.ok(visibility.glyph.top >= visibility.viewport.top && visibility.glyph.bottom <= visibility.viewport.bottom,
    "complete text can be scrolled into the visible body without hiding under fixed chrome");
  assert.ok(visibility.unobscured, "the visible body text is not covered by chrome");
  return visibility;
}

async function readableWorkspace(context: Locator, evidencePath: string) {
  const geometry = await context.evaluate(node => {
    const content = node.querySelector<HTMLElement>('[data-surface-slot="content"]')!;
    const heading = node.querySelector<HTMLElement>('[data-surface-slot="top"] h2')!;
    return { width: node.getBoundingClientRect().width, viewportWidth: innerWidth,
      documentHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight,
      contentHeight: content.clientHeight, contentScrollHeight: content.scrollHeight,
      contentWidth: content.clientWidth, contentScrollWidth: content.scrollWidth,
      bodyLineHeight: parseFloat(getComputedStyle(content).lineHeight),
      titleLineHeight: parseFloat(getComputedStyle(heading).lineHeight) };
  });
  await writeFile(`${evidencePath}.json`, JSON.stringify(geometry, null, 2));
  assert.equal(await context.locator('[data-surface-slot="bottom"]').count(), 0);
  assert.ok(geometry.width <= geometry.viewportWidth && geometry.contentScrollWidth <= geometry.contentWidth + 1,
    "long reading wraps within the viewport without horizontal clipping");
  assert.ok(geometry.contentScrollHeight > geometry.contentHeight, "the complete context remains reachable inside the surface viewport");
  assert.equal(geometry.documentHeight, geometry.viewportHeight, "reading does not create an outer document scrollbar");
  return geometry;
}

test("long reading and review stay reachable at compact heights and enlarged text", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  type Geometry = Awaited<ReturnType<typeof reachableChrome>>;
  type Visibility = Awaited<ReturnType<typeof readableText>>;
  const measurements: { width: number; height: number; scale: number; context: Awaited<ReturnType<typeof readableWorkspace>>; review: Geometry;
    titleVisibility: Visibility; bodyVisibility: Visibility; reviewTitleVisibility: Visibility; reviewBodyVisibility: Visibility }[] = [];
  const directory = `artifacts/toolbar-overflow/${basename(process.env.DESERT_WEB_BUILD ?? "current")}`;
  try {
    assert.equal(title.length, 234);
    await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill(body);
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    const context = activePanel(f.page);
    await waitForNote(f.page, title);
    await mkdir(directory, { recursive: true });
    const cases = [
      ...[1, 1.3, 2].map(scale => ({ width: 320, height: 568, scale })),
      { width: 390, height: 844, scale: 2 }, { width: 390, height: 700, scale: 2 },
    ];
    for (const { width, height, scale } of cases) await t.test(`${width}×${height} at ${scale * 100}%`, async () => {
      const example = `${width}x${height}-scale-${scale}`;
      try {
      await f.page.setViewportSize({ width, height });
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      const dialog = f.page.getByRole("dialog");
      await settleMotion(f.page);
      const heading = context.locator('[data-toolbar-title]').getByText(title, { exact: true });
      assert.equal(await heading.textContent(), title, "CSS bounds do not shorten the accessible name");
      const content = context.locator('[data-surface-slot="content"]');
      assert.equal(await content.getByText(title, { exact: true }).count(), 0, "reading identity is not repeated as a metadata row");
      const prose = content.locator('[data-reading="multiline"]').filter({ hasText: "Final retained paragraph." });
      assert.equal(await prose.textContent(), body);
      const geometry = await readableWorkspace(context, `${directory}/context-${example}`);
      if (measurements[0]) {
        assert.ok(geometry.bodyLineHeight >= measurements[0].context.bodyLineHeight * scale - .5,
          "the reading area is preserved without reducing the enlarged body text");
        assert.ok(geometry.titleLineHeight >= measurements[0].context.titleLineHeight * scale - .5,
          "the complete reading title keeps its enlarged typography");
      }
      const titleVisibility = await readableText(heading);
      if (scale === 2) await f.page.screenshot({ path: `${directory}/context-title-${example}.png` });
      const bodyVisibility = await readableText(prose, true);
      if (scale === 2) await f.page.screenshot({ path: `${directory}/context-end-${example}.png` });
      await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).scrollIntoViewIfNeeded();
      await f.page.screenshot({ path: `${directory}/context-${example}.png` });
      const archive = context.getByRole("button", { name: "Archive note", exact: true });
      await archive.click();
      const journey = activePanel(f.page);
      await journey.locator('[data-toolbar-title]').getByText("Review · Archive note", { exact: true }).waitFor();
      const review = await reachableChrome(dialog, `${directory}/review-${example}`);
      assert.equal(await journey.locator('[data-surface-slot="top"] p').textContent(), "Status: active → archived");
      assert.equal(await journey.locator(".fact-row").first().locator(".fact-label").textContent(), "Status",
        "the changed fact precedes long unchanged prose");
      const reviewTitleVisibility = await readableText(journey.locator('[data-surface-slot="content"]').getByText(title, { exact: true }));
      if (scale === 2) await f.page.screenshot({ path: `${directory}/review-title-${example}.png` });
      const reviewBodyVisibility = await readableText(journey.locator(".fact-value").filter({ hasText: "Final retained paragraph." }), true);
      if (scale === 2) await f.page.screenshot({ path: `${directory}/review-end-${example}.png` });
      await journey.locator('[data-surface-slot="content"]').evaluate(node => { node.scrollTop = 0; });
      await f.page.screenshot({ path: `${directory}/review-${example}.png` });
      measurements.push({ width, height, scale, context: geometry, review, titleVisibility, bodyVisibility, reviewTitleVisibility, reviewBodyVisibility });
      await journey.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Back", exact: true }).click();
      await waitForNote(f.page, title);
      } finally {
        // A failed geometry case must not prevent evidence for the remaining sizes.
        await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "1"));
        await f.page.setViewportSize({ width: 1280, height: 900 });
        const back = panelToolbar(f.page, "bottom").getByRole("button", { name: "Back", exact: true });
        if (await back.isVisible()) await back.click();
        await waitForNote(f.page, title);
      }
    });
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await context.waitFor({ state: "hidden" });
    await writeFile(`${directory}/measurements.json`, JSON.stringify({ titleLength: title.length, measurements, errors: f.errors }, null, 2));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
