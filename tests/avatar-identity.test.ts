import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { avatarEvidence, avatarGeometry, avatarViolations } from "./web/avatar-identity-expectations.ts";

test("shared avatar keeps long names readable in actual light and dark themes at 200 percent", { timeout: 60000 }, async () => {
  const source = `<script lang="ts">
    import MediaControl from "@desert/svelte/controls/MediaControl.svelte";
    import * as Card from "@desert/svelte/vendor/components/ui/card/index.js";
    const node = {version:"desert.control/1",kind:"avatar",id:"independent-identity",disabled:false,
      label:"AlexandraVeryLongUnbrokenFamilyName Rivera",source:null,fallback:"AR"};
  </script><main style="padding:16px"><Card.Root><Card.Content>
    <MediaControl {node}/>
  </Card.Content></Card.Root></main>`;
  const f = await svelteBrowser(source), failures: string[] = [], palettes: string[] = [];
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 844 });
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
      const row = f.page.locator('[data-control="avatar"]');
      const geometry = await avatarGeometry(row), violations = avatarViolations(geometry, true);
      failures.push(...violations.map(value => `${colorScheme}: ${value}`));
      const font = await row.locator(":scope > span").evaluate(node => getComputedStyle(node).fontSize);
      assert.ok(parseFloat(font) >= 26, "the readable name really scales at 200%, not only its container");
      palettes.push(JSON.stringify(geometry.surface));
      const axe = await new AxeBuilder({ page: f.page }).include('[data-control="avatar"]').analyze();
      const serious = axe.violations.filter(item => item.impact === "serious" || item.impact === "critical");
      failures.push(...serious.map(item => `${colorScheme}: ${item.id}`));
      await avatarEvidence(f.page, `source-long-name-${colorScheme}`, { geometry, violations, font, axe: serious });
    }
    assert.notEqual(palettes[0], palettes[1], "actual theme surfaces change, not merely the media preference");
    assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("all four contract-permitted wide fallback characters fit without truncation", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import MediaControl from "@desert/svelte/controls/MediaControl.svelte";
    const node = {version:"desert.control/1",kind:"avatar",id:"wide-fallback",disabled:false,
      label:"William West",source:null,fallback:"WWWW"};
  </script><main style="padding:16px"><MediaControl {node}/></main>`);
  const failures: string[] = [];
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 844 });
    for (const colorScheme of ["light", "dark"] as const) for (const scale of [1, 2]) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      const row = f.page.locator('[data-control="avatar"]'), fallback = row.locator('[data-slot="avatar-fallback"]');
      assert.equal(await fallback.innerText(), "WWWW", "preserve the full permitted fallback text");
      const geometry = await avatarGeometry(row), violations = avatarViolations(geometry, true);
      failures.push(...violations.map(value => `${colorScheme}/${scale}: ${value}`));
      await avatarEvidence(f.page, `source-four-wide-${colorScheme}-${scale}`, { geometry, violations }, row);
    }
    assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
