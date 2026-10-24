// Mechanism media-gestures: the pointer gestures of one media surface. A horizontal swipe pages, a pinch, a double-click
// or ctrl-wheel zooms the image, a drag pans it while zoomed; vertical drags stay native scrolling.
export const maximumMediaZoom = 4;

type Options = {
  image: () => HTMLImageElement | null; page: (direction: number) => void;
  canPage: () => boolean; zoomable?: boolean; onzoom?: (scale: number) => void;
  /** Pointer downs on these targets stay theirs (a player's controls inside the surface). */
  ignore?: (target: Element) => boolean;
};
/** Pointer ownership is local to the canvas. Vertical header gestures remain native scrolling. */
export function mediaGestures(element: HTMLElement, options: Options) {
  const points = new Map<number, { x: number; y: number }>();
  let scale = 1, x = 0, y = 0, dragged = false, suppress = false;
  let start: { x: number; y: number; px: number; py: number } | undefined;
  let pinch: { distance: number; scale: number } | undefined;
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  function paint() {
    options.onzoom?.(scale);
    const img = options.image(); if (!img || !img.naturalWidth) return;
    const box = element.getBoundingClientRect(), ratio = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const maxX = Math.max(0, (img.naturalWidth * ratio * scale - box.width) / 2);
    const maxY = Math.max(0, (img.naturalHeight * ratio * scale - box.height) / 2);
    x = clamp(x, -maxX, maxX); y = clamp(y, -maxY, maxY);
    img.style.transform = scale === 1 ? '' : `translate(${x}px,${y}px) scale(${scale})`;
  }
  function zoom(value: number) { scale = clamp(value, 1, maximumMediaZoom); if (scale === 1) x = y = 0; paint(); }
  function distance() { const [a,b] = [...points.values()]; return a && b ? Math.hypot(a.x-b.x, a.y-b.y) : 1; }
  function down(e: PointerEvent) {
    const target = e.target instanceof Element ? e.target : null;
    if (e.button !== 0 || target && (target.closest('button') && !target.closest('[data-media-open]') || options.ignore?.(target))) return;
    points.set(e.pointerId, { x:e.clientX, y:e.clientY });
    element.setPointerCapture(e.pointerId); dragged = false; suppress = false;
    start = { x:e.clientX, y:e.clientY, px:x, py:y };
    if (points.size === 2 && options.zoomable) { pinch = { distance:distance(), scale }; dragged = true; }
  }
  function move(e: PointerEvent) {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pinch && points.size === 2) { zoom(pinch.scale * distance() / pinch.distance); dragged = true; return; }
    if (!start) return;
    const dx = e.clientX-start.x, dy = e.clientY-start.y;
    if (Math.hypot(dx,dy)>8) dragged = true;
    if (scale>1) { x=start.px+dx; y=start.py+dy; paint(); }
    else if (options.canPage() && Math.abs(dx)>Math.abs(dy)) {
      const img = options.image(); if (img) img.style.transform = `translateX(${dx*.55}px)`;
    }
  }
  function up(e: PointerEvent) {
    points.delete(e.pointerId); suppress = dragged;
    if (pinch) { if (!points.size) pinch=undefined; start=undefined; suppress=true; return; }
    if (!start) return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if (scale===1 && options.canPage() && Math.abs(dx)>Math.max(40,element.clientWidth*.12) && Math.abs(dx)>Math.abs(dy)) options.page(dx<0?1:-1);
    paint(); start=undefined;
  }
  function cancel() { points.clear(); pinch=undefined; start=undefined; suppress=true; paint(); }
  function click(e: MouseEvent) { if (suppress && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); suppress=false; } }
  function doubleClick() { if (options.zoomable) zoom(scale===1?2:1); }
  function wheel(e: WheelEvent) { if (options.zoomable && e.ctrlKey) { e.preventDefault(); zoom(scale*Math.exp(-e.deltaY*.01)); } }
  const controller = new AbortController(), signal = controller.signal;
  element.addEventListener('pointerdown',down,{signal}); element.addEventListener('pointermove',move,{signal});
  element.addEventListener('pointerup',up,{signal}); element.addEventListener('pointercancel',cancel,{signal});
  element.addEventListener('click',click,{signal,capture:true}); element.addEventListener('dblclick',doubleClick,{signal});
  element.addEventListener('wheel',wheel,{signal,passive:false});
  const resize = new ResizeObserver(paint); resize.observe(element);
  return { zoom, refresh:paint, reset:()=>zoom(1), destroy() { controller.abort(); resize.disconnect(); } };
}
