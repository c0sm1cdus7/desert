/** Overlay padding belongs to the rail's hit region, not its reading occlusion.
 * Flow toolbars occupy their entire frame; overlay rails protect visible content. */
export function toolbarBounds(toolbar: HTMLElement): DOMRect {
  return (toolbar.hasAttribute('data-toolbar-overlay')
    ? toolbar.querySelector<HTMLElement>(':scope > .toolbar-row') ?? toolbar
    : toolbar).getBoundingClientRect();
}
