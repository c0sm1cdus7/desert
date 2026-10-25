// A disabled field with a value reads as «a value, but off», never as an empty field's placeholder (fourth review of the
// slice 3 package): faded once by half, a disabled date's «Oct 16, 2026» was as grey as an empty date's «No date
// selected». Field has one disabled treatment for every kind (a date, a one-line and a multiline input, a trigger): its
// content fades once and equally (the label, the value, a placeholder), and at that fade the value keeps its ink
// relationship: it stays darker (in dark, lighter) than any placeholder, enabled or disabled, and lighter than an enabled
// value. Measured as each ink's contrast on the well as drawn (its colour, faded by every opacity above it, over the well).
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

/** Each text of each field: its contrast on the well it stands in (its ink composited with its cumulative opacity). */
function inks() {
  const rgb = (color: string) => { const c = new OffscreenCanvas(1, 1).getContext("2d")!; c.fillStyle = color; c.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data; return [r!, g!, b!, a! / 255] as const; };
  const over = (top: readonly number[], under: readonly number[], alpha: number) => top.slice(0, 3).map((v, i) => v * alpha + under[i]! * (1 - alpha));
  const luminance = (c: readonly number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * b!; };
  const contrast = (a: readonly number[], b: readonly number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05); };
  const page = rgb(getComputedStyle(document.querySelector("main")!).backgroundColor);
  return [...document.querySelectorAll("[data-case]")].map(scope => {
    const field = scope.querySelector('[data-slot="field"]'), well = field?.querySelector(".field-well");
    if (!field || !well) return { case: scope.getAttribute("data-case")!, disabled: false, label: { fade: 1, contrast: 0 }, value: undefined, placeholder: undefined };
    const fill = rgb(getComputedStyle(well).backgroundColor), ground = over(fill, page, fill[3]);
    const drawn = (element: Element) => { let fade = 1; for (let node: Element | null = element; node; node = node.parentElement) fade *= Number(getComputedStyle(node).opacity);
      const ink = rgb(getComputedStyle(element).color); return { fade: Math.round(fade * 100) / 100, contrast: contrast(over(ink, ground, ink[3] * fade), ground), ink: getComputedStyle(element).color, ground: ground.map(Math.round).join() }; };
    const label = well.querySelector('[data-slot="field-label"]') ?? well;
    const editor = well.querySelector("input, textarea");
    const shown = [...well.querySelectorAll("[data-field-value] span, [data-field-value]")].find(element =>
      [...element.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim()));
    const value = editor && (editor as HTMLInputElement).value ? editor : shown && !shown.classList.contains("field-placeholder") ? shown : undefined;
    const placeholder = well.querySelector(".field-placeholder");
    return { case: scope.getAttribute("data-case")!, disabled: field.getAttribute("data-disabled") === "true",
      label: drawn(label), value: value ? drawn(value) : undefined, placeholder: placeholder ? drawn(placeholder) : undefined };
  });
}

test("a disabled field's value is a value, but off: darker than every placeholder, lighter than an enabled value", async () => {
  const f = await mounted(`<main style="padding:16px;display:grid;gap:12px;width:358px;background:var(--background)">
  {#each DateControlSpecimens as specimen}<div data-case="date-{specimen.state}"><Catalog.DateControl {...specimen.props} /></div>{/each}
  {#each FieldSpecimens.filter(s => s.variants?.measure === "fill") as specimen}<div data-case="field-{specimen.state}-{specimen.variants?.primitive}"><Catalog.Field {...specimen.props} /></div>{/each}
  <div data-case="date-disabled-empty"><Catalog.DateControl node={{ version: "desert.control/1", kind: "date", id: "off-empty", label: "Arrival", disabled: true, required: false, value: null }} /></div>
  <div data-case="field-disabled-trigger-text"><Catalog.Field primitive="trigger" label="Country" labelVisibility="visible" measure="fill" required={false} invalid={false} disabled={true}
    display={{ kind: "text", text: "Argentina", placeholder: false }} disclosure={{ id: "off-text", controls: "off-text-list", expanded: false, haspopup: "listbox" }} /></div>
  </main>`, `  import { DateControlSpecimens } from "@desert/svelte/catalog/foundations/date-control/date-control.specimens.ts";
  import { FieldSpecimens } from "@desert/svelte/catalog/foundations/field/field.specimens.ts";`);
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      await f.page.setViewportSize({ width: 390, height: 1400 });
      // The inks change scheme through their colour transitions: read them once those have run.
      await f.page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined))));
      await f.page.waitForTimeout(300);
      const read = await f.page.evaluate(inks), seen = JSON.stringify(read, null, 1);
      const off = read.filter(item => item.disabled && item.value), on = read.filter(item => !item.disabled && item.value);
      const placeholders = read.flatMap(item => item.placeholder ? [item.placeholder.contrast] : []);
      // The witnesses: a disabled date, one-line and multiline input, and a trigger with text, each holding a value; an
      // enabled and a disabled empty date showing the placeholder.
      for (const name of ["date-disabled", "field-disabled-input.text", "field-disabled-input.multiline", "field-disabled-trigger-text"])
        assert.ok(off.some(item => item.case === name), `${colorScheme}: ${name} holds a value: ${seen}`);
      assert.ok(read.find(item => item.case === "date-empty")?.placeholder && read.find(item => item.case === "date-disabled-empty")?.placeholder,
        `${colorScheme}: the empty dates show their placeholder: ${seen}`);
      const brightest = Math.max(...placeholders), dimmest = Math.min(...on.map(item => item.value!.contrast));
      const fades = new Set(off.flatMap(item => [item.value!.fade, item.label.fade]));
      assert.equal(fades.size, 1, `${colorScheme}: one disabled fade for every field kind, its label and its value alike: ${seen}`);
      const [fade] = [...fades];
      assert.ok(fade! < 1, `${colorScheme}: a disabled field is faded: ${seen}`);
      for (const item of off) {
        assert.ok(item.value!.contrast >= brightest * 1.25,
          `${colorScheme}: ${item.case}'s value (${item.value!.contrast.toFixed(2)}:1) reads as a value, not as a placeholder (up to ${brightest.toFixed(2)}:1): ${seen}`);
        assert.ok(item.value!.contrast * 1.25 <= dimmest,
          `${colorScheme}: ${item.case}'s value (${item.value!.contrast.toFixed(2)}:1) reads as off beside an enabled value (${dimmest.toFixed(2)}:1): ${seen}`);
      }
      const disabledEmpty = read.find(item => item.case === "date-disabled-empty")!;
      assert.equal(disabledEmpty.placeholder!.fade, fade, `${colorScheme}: a disabled placeholder fades as much as a disabled value: ${seen}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
