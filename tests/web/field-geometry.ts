import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Locator, Page } from "playwright";

// Independent visual commitments: one start edge, readable label/value separation,
// contained wrapped labels and a scroll viewport that cannot paint over its label.
export async function fieldGeometry(field: Locator) {
  return field.evaluate(element => {
    const control = element.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-slot="input-group-control"]')!;
    const label = element.querySelector<HTMLLabelElement>('[data-slot="field-label"]')!;
    const well = element.querySelector<HTMLElement>('[data-floating-field]')!;
    const box = control.getBoundingClientRect(), labelBox = label.getBoundingClientRect(), wellBox = well.getBoundingClientRect();
    const style = getComputedStyle(control);
    const labelRange = document.createRange(); labelRange.selectNodeContents(label);
    const labelGlyphs = labelRange.getBoundingClientRect();
    const number = (value: string) => parseFloat(value) || 0;
    const top = number(style.borderTopWidth) + number(style.paddingTop);
    const bottom = number(style.borderBottomWidth) + number(style.paddingBottom);
    const line = number(style.lineHeight);
    // Single-line native inputs center the editing line in their content box.
    const lineTop = box.top + top + (control.tagName === "INPUT" ? Math.max(0, box.height - top - bottom - line) / 2 : 0);
    const error = element.querySelector('[data-slot="field-error"]')?.getBoundingClientRect();
    return { label: labelBox.toJSON(), control: box.toJSON(), well: wellBox.toJSON(),
      valueStart: box.left + number(style.borderLeftWidth) + number(style.paddingLeft), lineTop,
      lineBottom: lineTop + line, line, value: control.value, disabled: control.disabled,
      invalid: control.getAttribute("aria-invalid"), required: control.required,
      associated: label.htmlFor === control.id, innerBorder: number(style.borderTopWidth),
      errorTop: error?.top, scrollTop: control.scrollTop, scrollHeight: control.scrollHeight,
      clientHeight: control.clientHeight, labelText: label.textContent, labelGlyphs: labelGlyphs.toJSON() };
  });
}

export function geometryProblems(geometry: Awaited<ReturnType<typeof fieldGeometry>>, filled: boolean) {
  const errors: string[] = [];
  const check = (condition: boolean, message: string) => { if (!condition) errors.push(message); };
  check(Math.abs(geometry.label.left - geometry.valueStart) <= 1, "Label and value must share their start edge");
  check(geometry.label.left >= geometry.well.left && geometry.label.right <= geometry.well.right,
    "Label must remain horizontally contained");
  check(geometry.labelGlyphs.left >= geometry.well.left && geometry.labelGlyphs.right <= geometry.well.right,
    "The actual label text must not overflow its box");
  check(geometry.label.top >= geometry.well.top && geometry.label.bottom <= geometry.well.bottom,
    "Label must remain vertically contained");
  if (filled) check(geometry.lineTop - geometry.label.bottom >= 3.5, "Label and writing need at least 4px of separation");
  check(geometry.lineBottom <= geometry.well.bottom, "Editing line must remain inside the field");
  check(geometry.innerBorder === 0, "InputGroup remains the only field border");
  check(geometry.associated, "Visible label must stay associated with the control");
  if (geometry.errorTop !== undefined) check(geometry.errorTop >= geometry.well.bottom, "Error text must not overlap the well");
  return errors;
}

// Stress only the rendered label text, never the component implementation or CSS.
// The same stress is applied to the frozen build and the candidate build.
export async function stressLabel(field: Locator, text: string) {
  await field.locator('[data-slot="field-label"]').evaluate((label, value) => {
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement === label && node.textContent?.trim()) { node.textContent = value; break; }
    }
    const control = document.getElementById((label as HTMLLabelElement).htmlFor);
    control?.setAttribute("aria-label", value);
  }, text);
}

export async function saveFieldEvidence(page: Page, name: string, samples: unknown, failures: string[]) {
  const directory = `artifacts/field-alignment/${process.env.DESERT_FIELD_PHASE ?? "current"}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ build: process.env.DESERT_CATALOG_BUILD,
    samples, failures, scope: "Chromium geometry, synthetic long-label/text-size stress; no product writes." }, null, 2) + "\n");
  await page.screenshot({ path: `${directory}/${name}.png`, animations: "disabled" });
  assert.deepEqual(failures, []);
}
