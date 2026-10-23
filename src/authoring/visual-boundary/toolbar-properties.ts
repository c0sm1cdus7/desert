export const decodeCss = (value: string) => value.replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\\([\da-f]{1,6})\s?|\\([^\r\n])/gi,
    (_, code: string | undefined, character: string | undefined) => code ? String.fromCodePoint(parseInt(code, 16)) : character!);

export function cssProperty(value: unknown): string {
  const decoded = decodeCss(String(value)).trim();
  return decoded.startsWith("--") ? decoded : decoded.toLowerCase().replace(/^-(?:webkit|moz|ms|o)-/, "");
}

export function cssDeclarationProperty(declaration: { start?: unknown; end?: unknown }, source: string): string {
  const text = source.slice(Number(declaration.start), Number(declaration.end)).replace(/\/\*[\s\S]*?\*\//g, "");
  return cssProperty(text.slice(0, text.indexOf(":")));
}

const geometry = /^(?:all|padding|margin|gap|row-gap|column-gap|width|height|min-width|min-height|max-width|max-height|inline-size|block-size|min-inline-size|min-block-size|max-inline-size|max-block-size|flex|align-items|align-self|justify-content|box-sizing|font|line-height|letter-spacing|text-indent|position|top|bottom|left|right|inset|translate|rotate|scale|transform|display|order|white-space|text-align|text-overflow|writing-mode|overflow|visibility|opacity|clip)(?:-|$)/;
export const isToolbarGeometry = (property: unknown): boolean => geometry.test(cssProperty(property));
