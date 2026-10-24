// One evidence image per specimen: the four captures side by side, light on the top row and dark below, 390 px wide on
// the left and 1280 px on the right, on a neutral grey so neither theme's background blends into the gutter.
import sharp, { type OverlayOptions } from "sharp";

export const themes = ["light", "dark"] as const;
export const widths = [390, 1280] as const;
export type Theme = typeof themes[number];
export type Width = typeof widths[number];
export type Combination = Readonly<{ theme: Theme; width: Width }>;
export const combinations: readonly Combination[] = themes.flatMap(theme => widths.map(width => ({ theme, width })));
export const combinationName = ({ theme, width }: Combination) => `${theme}-${width}`;

const gutter = 24, grey = { r: 128, g: 128, b: 128, alpha: 1 };

async function sizeOf(png: Buffer) {
  const { width, height } = await sharp(png).metadata();
  if (width === undefined || height === undefined) throw new Error("EVIDENCE_SHEET: a capture has no size");
  return { width, height };
}

/** Composes the four captures of one specimen (keyed by combinationName) into one PNG. */
export async function composeSheet(captures: ReadonlyMap<string, Buffer>): Promise<Buffer> {
  const cell = async (combination: Combination) => {
    const png = captures.get(combinationName(combination));
    if (!png) throw new Error(`EVIDENCE_SHEET: no ${combinationName(combination)} capture`);
    return { png, ...await sizeOf(png) };
  };
  const rows = await Promise.all(themes.map(theme => Promise.all(widths.map(width => cell({ theme, width })))));
  const columnWidths = widths.map((_, column) => Math.max(...rows.map(row => row[column]?.width ?? 0)));
  const rowHeights = rows.map(row => Math.max(...row.map(item => item.height)));
  const width = columnWidths.reduce((sum, value) => sum + value, 0) + gutter * (widths.length + 1);
  const height = rowHeights.reduce((sum, value) => sum + value, 0) + gutter * (themes.length + 1);
  const composite: OverlayOptions[] = [];
  let top = gutter;
  rows.forEach((row, rowIndex) => {
    let left = gutter;
    row.forEach((item, column) => { composite.push({ input: item.png, top, left }); left += (columnWidths[column] ?? 0) + gutter; });
    top += (rowHeights[rowIndex] ?? 0) + gutter;
  });
  return sharp({ create: { width, height, channels: 4, background: grey } }).composite(composite).png().toBuffer();
}
