// Whether the page is narrow, for a piece that must change its markup there (not only its styles): typography.css alone
// decides it (the narrow-page variant), and this reads that decision from layout. One probe in the document takes a pixel of
// width only on a narrow page; a resize observer reports each flip, so the threshold is never restated here.
let narrow = $state(false), users = 0, release: (() => void) | undefined;

function observe(): () => void {
  const probe = document.createElement("span");
  probe.className = "narrow-page-probe";
  probe.setAttribute("aria-hidden", "true");
  document.body.append(probe);
  const observer = new ResizeObserver(() => { narrow = probe.getBoundingClientRect().width > 0; });
  observer.observe(probe);
  return () => { observer.disconnect(); probe.remove(); narrow = false; };
}

/** Whether the page is narrow now; read it inside a component, whose effect keeps the one probe alive while any reads it. */
export function narrowPage(): { readonly current: boolean } {
  $effect(() => {
    if (users++ === 0) release = observe();
    return () => { if (--users === 0) { release?.(); release = undefined; } };
  });
  return { get current() { return narrow; } };
}
