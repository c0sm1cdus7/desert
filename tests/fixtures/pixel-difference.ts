// Pixel comparison of two PNG screenshots, decoded by the page itself (no image package): how many channel values differ
// by more than `tolerance`, and whether every difference stays within it. A glyph drawn by another owner (Action's Icon
// instead of a vendor button's own svg) can antialias a few levels apart at the same place; a layout change cannot hide.
import type { Page } from "playwright";

export async function pixelDifference(page: Page, first: Buffer, second: Buffer, tolerance: number) {
  return page.evaluate(async ({ first, second, tolerance }) => {
    const read = async (data: string) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext("2d");
      if (!context) throw new Error("PIXEL_DIFFERENCE: no 2d context");
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    };
    const [a, b] = [await read(first), await read(second)];
    let count = 0, within = a.length === b.length;
    for (let index = 0; index < a.length; index++) if (Math.abs((a[index] ?? 0) - (b[index] ?? 0)) > tolerance) { count++; within = false; }
    return { count, within };
  }, { first: first.toString("base64"), second: second.toString("base64"), tolerance });
}
