/** Adjacent facts share one pane; unrelated content never joins that group. */
export function groupRelatedItems<T extends { readonly kind: string }>(items: readonly T[]): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const previous = groups.at(-1);
    if (item.kind === "fact" && previous?.[0]?.kind === "fact") previous.push(item);
    else groups.push([item]);
  }
  return groups;
}
