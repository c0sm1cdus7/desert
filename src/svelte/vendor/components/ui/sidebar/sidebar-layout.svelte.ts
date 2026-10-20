type ElementSource = () => HTMLElement | null;

/** Fit the docked sidebar and the content's reading budget inside their host. */
export function sidebarLayout(host: ElementSource, dockedBudget: ElementSource) {
  let availableInlineSize = $state(0);
  let requiredDockedInlineSize = $state(Infinity);
  $effect(() => {
    const container = host(), budget = dockedBudget();
    if (!container || !budget) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const inlineSize = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;
        if (entry.target === container) availableInlineSize = inlineSize;
        else if (entry.target === budget) requiredDockedInlineSize = inlineSize;
      }
    });
    observer.observe(container); observer.observe(budget);
    return () => observer.disconnect();
  });
  return {
    get presentation(): "docked" | "overlay" {
      return availableInlineSize >= requiredDockedInlineSize ? "docked" : "overlay";
    },
  };
}
