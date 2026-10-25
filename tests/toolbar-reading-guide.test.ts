import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { toolbarReadingGuideSource } from "./fixtures/toolbar-reading-guide.ts";

async function settle(page: Page) {
  await page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
}
async function measure(page: Page) {
  await settle(page);
  return page.locator("[data-catalog-content]").evaluate(owner => {
    const textLeft = (selector: string) => {
      const range = document.createRange(); range.selectNodeContents(owner.querySelector(selector)!);
      return range.getBoundingClientRect().left;
    };
    const toolbar = owner.querySelector<HTMLElement>("[data-place-toolbar]")!;
    const rail = toolbar.querySelector<HTMLElement>(".toolbar-row")!;
    const navigation = rail.querySelector<HTMLElement>("[data-toolbar-leading]");
    const buttons = [...(navigation?.querySelectorAll("button") ?? [])].map(button => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    });
    return {
      header: textLeft("[data-place-title]"), subtitle: textLeft("[data-place-header] [data-place-subtitle]"),
      content: textLeft("[data-view-item='section-0'] .place-stack-title h2"),
      compact: textLeft("[data-identity-title]"), compactSubtitle: textLeft("[data-identity-subtitle]"),
      navigationDisplay: navigation ? getComputedStyle(navigation).display : "absent", buttons,
      navigationReturn: (()=>{const button=owner.querySelector('button[aria-label="Show navigation"]');
        return button?.checkVisibility() ? { ...button.getBoundingClientRect().toJSON(), edge:button.closest('[data-toolbar]')?.getAttribute('data-toolbar') } : null;})(),
      rail: rail.getBoundingClientRect().left, gap: getComputedStyle(rail).columnGap,
      padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map(key => getComputedStyle(toolbar)[key as "paddingTop"]),
    };
  });
}
async function sidebar(page: Page, expanded: boolean) {
  await page.getByRole("button", { name: expanded ? "Show navigation" : "Hide navigation", exact: true }).click();
  await page.locator(`[data-slot='sidebar-wrapper'][data-state='${expanded ? "expanded" : "collapsed"}']`).waitFor();
  await settle(page);
}
function assertRail(value: Awaited<ReturnType<typeof measure>>, textScale: number) {
  assert.deepEqual(value.padding, ["8px", "8px", "8px", "8px"], "canonical rail inset is not adjusted to fix identity");
  assert.equal(value.gap, "12px");
  for (const button of value.buttons) {
    assert.ok(button.width >= 44 && Math.abs(button.width - button.height) < .5, "actions keep square accessible targets");
    if (textScale === 1) assert.equal(button.height, 44);
  }
  if (value.buttons.length) {
    assert.ok(Math.abs(value.buttons[0]!.left - value.rail) < .5, "first action starts on the rail");
    assert.ok(Math.abs(value.compact - value.buttons.at(-1)!.right - 12) < .5, "identity follows real actions by exactly one rail gap");
  }
}

for (const [width, textScale] of [[1280, 1], [1920, 2]] as const) {
  for (const withAction of [false, true]) {
    test(`compact identity uses its reading guide with ${withAction ? "an action" : "no actions"}, ${textScale * 100}% text`, async () => {
      const f = await svelteBrowser(toolbarReadingGuideSource(withAction), {}, "http://reading-guide.test/");
      try {
        await f.page.setViewportSize({ width, height: 900 });
        await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await f.page.addStyleTag({ content: await rendererCss() });
        if (textScale === 2) await f.page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await f.page.locator("[data-slot='sidebar-wrapper'][data-presentation='docked'][data-state='expanded']").waitFor();
        const before = await measure(f.page);
        assert.ok(Math.abs(before.header - before.content) < .5, "real header and stack establish the same reading guide");
        assert.ok(Math.abs(before.subtitle - before.content) < .5);
        await f.page.locator("[data-catalog-scroll]").evaluate(node => { node.scrollTop = 500; });
        await f.page.waitForFunction(() => Number(getComputedStyle(document.querySelector("[data-toolbar-identity]")!).opacity) > .99);
        const opened = await measure(f.page);
        await sidebar(f.page, false);
        const collapsed = await measure(f.page);
        await sidebar(f.page, true);
        const reopened = await measure(f.page);
        for (const value of [opened, collapsed, reopened]) assertRail(value, textScale);
        assert.equal(collapsed.buttons.length, opened.buttons.length,
          'navigation collapse never adds a leading action or displaces the title');
        assert.equal(collapsed.navigationReturn?.edge,'bottom','navigation return belongs to the main bottom toolbar');
        assert.ok(collapsed.navigationReturn!.y > 700,'navigation return stays at the bottom edge');
        {
          const observations = [opened, collapsed, reopened].map(value => ({
            titleDelta: value.compact - value.content,
            subtitleDelta: value.compactSubtitle - value.content,
            emptyNavigationParticipates: value.buttons.length === 0 && !["none", "absent"].includes(value.navigationDisplay),
          }));
          assert.ok(observations.every(value => Math.abs(value.titleDelta) < .5 && Math.abs(value.subtitleDelta) < .5
            && !value.emptyNavigationParticipates), `trailing commands and navigation return must not shift the reading guide: ${JSON.stringify(observations)}`);
        }
        assert.deepEqual(f.errors, []);
      } finally { await f.close(); }
    });
  }
}
