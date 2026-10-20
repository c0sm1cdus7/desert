import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator, Page } from "playwright";

// Independent response to the owner's uncontained 'YT' screenshot. These are
// readability/identity expectations, not measurements copied from renderer CSS.
export async function avatarGeometry(row: Locator) {
  return row.evaluate(element => {
    const face = element.querySelector('[data-slot="avatar"]') as HTMLElement;
    const fallback = face.querySelector('[data-slot="avatar-fallback"]') as HTMLElement | null;
    const label = element.lastElementChild as HTMLElement;
    const box = (node: Element) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const ctx = document.createElement("canvas").getContext("2d")!;
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    let ancestor: Element | null = element, surface = [255, 255, 255, 255];
    while (ancestor) {
      const paint = rgba(getComputedStyle(ancestor).backgroundColor);
      if (paint[3]! > 240) { surface = paint; break; }
      ancestor = ancestor.parentElement;
    }
    const style = getComputedStyle(face), outline = getComputedStyle(face, "::after");
    const range = document.createRange(); range.selectNodeContents(fallback ?? label);
    const glyph = range.getBoundingClientRect();
    return { face: box(face), label: box(label), row: box(element), surface,
      fill: rgba(style.backgroundColor),
      outline: rgba(outline.borderTopColor), outlineWidth: parseFloat(outline.borderTopWidth),
      outlineBlend: outline.mixBlendMode, radius: style.borderRadius,
      glyph: { x: glyph.x, y: glyph.y, right: glyph.right, bottom: glyph.bottom },
      labelOverflow: label.scrollWidth > label.clientWidth + 1,
      hiddenFace: face.getAttribute("aria-hidden") === "true" || !!face.closest('[aria-hidden="true"]'),
      viewport: innerWidth };
  });
}

export function avatarViolations(g: Awaited<ReturnType<typeof avatarGeometry>>, fallback: boolean) {
  const errors: string[] = [], contrast = (a: number[], b: number[]) => {
    const lum = (rgb: number[]) => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((total, value, i) => total + value * [.2126, .7152, .0722][i]!, 0);
    const [x, y] = [lum(a), lum(b)].sort((a, b) => b - a);
    return (x! + .05) / (y! + .05);
  };
  if (Math.abs(g.face.width - g.face.height) > 1 || g.face.width < 32) errors.push("identity face is not a stable square");
  if (g.face.right + 6 > g.label.x) errors.push("face and label collide or lose their separation");
  if (g.labelOverflow || g.label.right > g.viewport + 1 || g.row.right > g.viewport + 1) errors.push("identity label overflows");
  if (!g.hiddenFace) errors.push("decorative face repeats the adjacent identity to assistive technology");
  const fillVisible = g.fill[3]! >= 240 && contrast(g.fill, g.surface) >= 1.1;
  const alpha = g.outline[3]! / 255;
  const paintedOutline = g.outline.slice(0, 3).map((channel, i) => channel * alpha + g.fill[i]! * (1 - alpha));
  const outlineVisible = g.outlineWidth >= 1 && g.outlineBlend === "normal" && contrast(paintedOutline, g.fill) >= 1.2;
  if (!fillVisible) errors.push("face requires its own perceptible background");
  if (!outlineVisible) errors.push("face requires its own perceptible border");
  if (fallback) {
    if (g.glyph.x < g.face.x || g.glyph.right > g.face.right || g.glyph.y < g.face.y || g.glyph.bottom > g.face.bottom)
      errors.push("initials escape the face");
    if (Math.abs((g.glyph.x + g.glyph.right - g.face.x - g.face.right) / 2) > 2) errors.push("initials are not horizontally centered");
  }
  return errors;
}

export async function avatarEvidence(page: Page, name: string, values: unknown, subject?: Locator) {
  const revision = basename(process.env.DESERT_CATALOG_BUILD ?? "unknown-build");
  const directory = new URL(`../../artifacts/avatar-identity/${revision}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(`${name}.json`, directory), JSON.stringify(values, null, 2) + "\n");
  if (subject) await subject.screenshot({ path: new URL(`${name}.png`, directory).pathname, animations: "disabled" });
  else await page.screenshot({ path: new URL(`${name}.png`, directory).pathname, animations: "disabled" });
}
