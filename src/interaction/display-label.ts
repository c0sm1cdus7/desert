/** Sentence-style labels only. Never apply this to stored values or object titles. */
export function displayLabel(label: string): string {
  return label.replace(/\p{L}/u, initial => initial.toUpperCase());
}
