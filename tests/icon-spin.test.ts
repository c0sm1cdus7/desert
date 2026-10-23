import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link", "row", "field", "well"];
const source = `<script lang="ts">
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import { Spinner } from '@desert/svelte/vendor/components/ui/spinner/index.js';
  import Action from '@desert/svelte/pieces/Action.svelte';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  let clicks = $state(0), spinning = $state(true);
</script>
<main style="padding:24px;display:grid;gap:12px;max-width:800px">
  {#each ${JSON.stringify(variants)} as variant}
    <section data-variant={variant} style="display:grid;grid-template-columns:100px repeat(3,1fr);gap:12px;align-items:center">
      <span>{variant}</span>
      <Button {variant} aria-label={variant + ' still'} data-case="still"><RotateCw data-icon="inline-start" aria-hidden="true"/><span data-caption>Still</span></Button>
      <Button {variant} spin={spinning} aria-label={variant + ' spin'} data-case="spin" onclick={() => clicks++}><RotateCw data-icon="inline-start" aria-hidden="true"/><span data-caption>Spin</span></Button>
      <Button {variant} disabled aria-label={variant + ' spinner'} data-case="spinner"><Spinner data-icon="inline-start" aria-hidden="true"/><span data-caption>Spinner</span></Button>
    </section>
  {/each}
  <section data-actions style="display:flex;gap:12px">
    <Action label="Save secondary" icon="save" state="pending"/>
    <Action label="Save primary" icon="save" state="pending" emphasis="primary"/>
    <div style="width:56px"><Action label="Retry the saved confirmation" icon="retry"/></div>
    <Action label="Unavailable action" icon="save" state="unavailable"/>
  </section>
  <div data-standalone style="color:var(--destructive)"><Spinner/></div>
  <button onclick={() => spinning = !spinning}>Toggle spin</button><output>{clicks}</output>
</main>`;

async function fixture() {
  const f = await svelteBrowser(source);
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.setViewportSize({ width: 900, height: 900 });
  return f;
}
async function evidence(f: Awaited<ReturnType<typeof fixture>>, name: string, observed: unknown) {
  const directory = `artifacts/icon-spin/${process.env.DESERT_EVIDENCE_PHASE ?? "current"}`;
  await mkdir(directory, { recursive: true });
  const sources = ["src/svelte/vendor/components/ui/button/button.svelte", "src/svelte/vendor/components/ui/spinner/spinner.svelte",
    "src/svelte/pieces/Action.svelte", "src/svelte/theme.css", "tests/icon-spin.test.ts"];
  const revision = Object.fromEntries(await Promise.all(sources.map(async path =>
    [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ revision, observed }, null, 2));
  await f.page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
  await f.page.locator("main").screenshot({ path: `${directory}/${name}.png`, animations: "disabled" });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`ordinary, spinning, and loading button icons inherit every variant foreground (${colorScheme})`, async () => {
    const f = await fixture();
    try {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
      const observed = await f.page.locator("[data-variant] [data-case]").evaluateAll(buttons => buttons.map(button => {
        const svg = button.querySelector("svg")!, icon = getComputedStyle(svg), owner = getComputedStyle(button);
        return { variant: button.closest("[data-variant]")!.getAttribute("data-variant"), kind: button.getAttribute("data-case"),
          buttonColor: owner.color, iconColor: icon.color, stroke: icon.stroke, width: icon.width, height: icon.height,
          animation: icon.animationName, duration: icon.animationDuration, iterations: icon.animationIterationCount,
          buttonAnimation: owner.animationName, captionAnimation: getComputedStyle(button.querySelector("[data-caption]")!).animationName };
      }));
      const standalone = await f.page.locator("[data-standalone]").evaluate(parent => ({
        color: getComputedStyle(parent).color, icon: getComputedStyle(parent.querySelector("svg")!).color,
        stroke: getComputedStyle(parent.querySelector("svg")!).stroke,
      }));
      await evidence(f, colorScheme, { buttons: observed, standalone });
      const failures: string[] = [];
      for (const item of observed) {
        const name = `${item.variant}/${item.kind}`;
        if (item.iconColor !== item.buttonColor || item.stroke !== item.buttonColor) failures.push(`${name}: icon must inherit button foreground`);
        if (item.kind === "still" ? item.animation !== "none" : item.animation === "none" || parseFloat(item.duration) <= 0 || item.iterations !== "infinite")
          failures.push(`${name}: only requested rotation runs continuously`);
        if (item.buttonAnimation !== "none" || item.captionAnimation !== "none") failures.push(`${name}: rotation must not animate button or caption`);
        assert.equal(item.width, "16px"); assert.equal(item.height, "16px");
      }
      if (standalone.icon !== standalone.color || standalone.stroke !== standalone.color) failures.push("standalone spinner must inherit its ancestor foreground");
      assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
    } finally { await f.close(); }
  });
}

test("spin is visual only while pending actions preserve accessible names, disabled state, and face geometry", async () => {
  const f = await fixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "no-preference" });
    const spin = f.page.getByRole("button", { name: "secondary spin", exact: true });
    assert.equal(await spin.isEnabled(), true); assert.equal(await spin.getAttribute("aria-busy"), null);
    await spin.click(); assert.equal(await f.page.locator("output").innerText(), "1");
    const observed = await f.page.locator("[data-actions] [data-primitive=action]").evaluateAll(buttons => buttons.map(button => ({
      name: button.getAttribute("aria-label"), busy: button.getAttribute("aria-busy"), disabled: (button as HTMLButtonElement).disabled,
      face: button.getAttribute("data-button-face"), iconCount: button.querySelectorAll("svg").length,
      animation: button.querySelector("svg") ? getComputedStyle(button.querySelector("svg")!).animationName : null,
      iconColor: button.querySelector("svg") ? getComputedStyle(button.querySelector("svg")!).color : null,
      color: getComputedStyle(button).color, background: getComputedStyle(button).backgroundColor,
      labelVisible: getComputedStyle(button.querySelector("[data-button-label]")!).visibility,
    })));
    await evidence(f, "semantics", observed);
    for (const name of ["Save secondary", "Save primary"]) {
      const button = f.page.getByRole("button", { name, exact: true });
      assert.equal(await button.isDisabled(), true); assert.equal(await button.getAttribute("aria-busy"), "true");
      assert.equal(await button.locator("svg").count(), 1);
      assert.equal(await button.locator("[data-button-label]").isVisible(), false);
      const item = observed.find(item => item.name === name)!;
      assert.equal(item.iconColor, item.color, "pending icon uses the ordinary button foreground");
      assert.notEqual(item.animation, "none", "pending icon rotates under normal motion preferences");
    }
    assert.notEqual(observed[0]!.color, observed[1]!.color, "pending primary retains its prominent foreground");
    assert.notEqual(observed[0]!.background, observed[1]!.background, "pending primary retains its tinted glass pane");
    assert.equal(observed[2]!.face, "icon"); assert.equal(observed[2]!.animation, "none");
    assert.equal(observed[2]!.busy, "false"); assert.equal(observed[2]!.disabled, false);
    assert.equal(observed[3]!.busy, "false"); assert.equal(observed[3]!.disabled, true);
    assert.equal(await f.page.getByRole("status", { name: "Loading", exact: true }).count(), 1, "only standalone loading status is announced");
    const geometry = await spin.boundingBox();
    await f.page.getByRole("button", { name: "Toggle spin", exact: true }).click();
    assert.equal(await spin.locator("svg").evaluate(icon => getComputedStyle(icon).animationName), "none");
    assert.deepEqual(await spin.boundingBox(), geometry, "spin never changes layout");
    assert.equal(await spin.isEnabled(), true); assert.equal(await spin.getAttribute("aria-busy"), null);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("reduced motion stops icon rotation without removing busy semantics or icons", async () => {
  const f = await fixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    const observed = await f.page.locator("svg").evaluateAll(icons => icons.map(icon => ({
      animation: getComputedStyle(icon).animationName, transform: getComputedStyle(icon).transform,
    })));
    await evidence(f, "reduced-motion", observed);
    for (const icon of observed) { assert.equal(icon.animation, "none"); assert.equal(icon.transform, "none"); }
    const busy = f.page.getByRole("button", { name: "Save secondary", exact: true });
    assert.equal(await busy.getAttribute("aria-busy"), "true"); assert.equal(await busy.isDisabled(), true);
    assert.equal(await busy.locator("svg").isVisible(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
