// Cuts a text to a length by whole code points, so a cut never leaves half a character behind.
/** The longest start of `text` within `limit` UTF-16 units that ends on a whole code point. */
export function cutText(text: string, limit: number): string {
  let kept = "";
  for (const point of text) {
    if (kept.length + point.length > limit) break;
    kept += point;
  }
  return kept;
}
