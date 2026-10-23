import type { Locator, Page } from "playwright";
import { settle } from "./public-catalog-expectations.ts";

// Compare rendered paint, not a particular filter string or opacity token.
// Removing only the pane's sampling must affect its paint, not the original
// full-width media, neighboring content or exterior gutter.
export async function sidebarPaintInfluence(page: Page) {
  const pane = (await page.locator('[data-slot="sidebar-container"]').boundingBox())!;
  const regions = [
    { name: "pane", x: 32, y: 180, width: 120, height: 100 },
    { name: "main", x: pane.x + pane.width + 24, y: 80, width: 96, height: 200 },
    { name: "outer-gutter", x: 0, y: 60, width: 4, height: 200 },
    { name: "top-gutter", x: 60, y: 0, width: 100, height: 4 },
  ];
  const decoration = page.locator('[data-slot="sidebar-inner"]');
  const before = await page.screenshot({ animations: "disabled" });
  const previous = await decoration.evaluateAll(elements => elements.map(element => {
    const node = element as HTMLElement, value = node.style.backdropFilter;
    node.style.backdropFilter = "none"; return value;
  }));
  let after: Buffer;
  try { after = await page.screenshot({ animations: "disabled" }); }
  finally { await decoration.evaluateAll((elements, values) => elements.forEach((element, index) => {
    (element as HTMLElement).style.backdropFilter = values[index]!;
  }), previous); }
  return page.evaluate(async ({ before, after, regions }) => {
    async function pixels(data: string) {
      const image = await createImageBitmap(new Blob([Uint8Array.from(atob(data), value => value.charCodeAt(0))]));
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      return { context, scale: image.width / innerWidth };
    }
    const a = await pixels(before), b = await pixels(after);
    return regions.map(region => {
      const args = [region.x, region.y, region.width, region.height].map(value => Math.round(value * a.scale));
      const first = a.context.getImageData(args[0]!, args[1]!, args[2]!, args[3]!).data;
      const second = b.context.getImageData(args[0]!, args[1]!, args[2]!, args[3]!).data;
      let changedPixels = 0, difference = 0;
      for (let offset = 0; offset < first.length; offset += 4) {
        const delta = [0, 1, 2].reduce((sum, channel) => sum + Math.abs(first[offset + channel]! - second[offset + channel]!), 0);
        if (delta) changedPixels++; difference += delta;
      }
      return { ...region, changedPixels, meanChannelDifference: difference / (first.length / 4 * 3) };
    });
  }, { before: before.toString("base64"), after: after!.toString("base64"), regions });
}

// Translucent material needs composited contrast, not its CSS fill alone.
// Remove glyph paint only; preserve layout, selection fill and all backdrops.
export async function navigationPixelContrast(page: Page, pane: Locator) {
  await page.mouse.move(page.viewportSize()!.width - 1, page.viewportSize()!.height - 1);
  await settle(page);
  const rows = await pane.locator('[data-slot="sidebar-menu-button"] [data-button-content] > span:last-child').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { name: element.textContent?.trim(), color: getComputedStyle(element).color,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  const labels = pane.locator('[data-slot="sidebar-menu-button"] [data-button-content] > span:last-child');
  const previous = await labels.evaluateAll(elements => elements.map(element => {
    const node = element as HTMLElement, visibility = node.style.visibility;
    node.style.visibility = "hidden"; return visibility;
  }));
  let png: Buffer;
  try { png = await page.screenshot({ animations: "disabled" }); }
  finally { await labels.evaluateAll((elements, values) => elements.forEach((element, index) => {
    (element as HTMLElement).style.visibility = values[index]!;
  }), previous); }
  return page.evaluate(async ({ data, rows }) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(data), value => value.charCodeAt(0))]));
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
    const scale = image.width / innerWidth;
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    return rows.map(row => {
      const foreground = row.color.match(/[\d.]+/gu)!.slice(0, 3).map(Number), a = luminance(foreground);
      let minimum = Infinity;
      for (let y = row.y + 1; y < row.y + row.height - 1; y += 2) {
        for (let x = row.x + 1; x < row.x + row.width - 1; x += 2) {
          const b = luminance([...context.getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data]);
          minimum = Math.min(minimum, (Math.max(a, b) + .05) / (Math.min(a, b) + .05));
        }
      }
      return { ...row, minimumContrast: minimum };
    });
  }, { data: png!.toString("base64"), rows });
}
