export type Photo = Readonly<{ source: string; alt: string }>;
export const mediaSource = (asset: string) => `/media/${encodeURIComponent(asset)}`;
export const catalogPhotos = (images: readonly { asset: string; alt: string }[]): Photo[] =>
  images.map(image => ({ source: mediaSource(image.asset), alt: image.alt }));
export function imageSource(source: string, edge: number) {
  if (!/^\/media\/[^/?#]+$/.test(source) || source.endsWith(".svg")) return source;
  const bucket = [160, 320, 640, 1280, 1920, 2560].find(size => size >= edge) ?? 2560;
  return `${source}?w=${bucket}`;
}

const pending = new Set<string>(), decoded = new Map<string, HTMLImageElement>();
let active = 0;
/** Intent/neighbor warming only: at most two requests, four queued, eight decoded photos. */
export function prefetchImage(source: string, edge: number) {
  if (typeof navigator === 'undefined' || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const url = imageSource(source, edge);
  if (decoded.has(url) || pending.has(url) || pending.size >= 4) return;
  pending.add(url); drain();
}
function drain() {
  while (active < 2 && pending.size) {
    const url = pending.values().next().value!; pending.delete(url);
    if (decoded.has(url)) continue;
    const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low';
    decoded.set(url, image); active++; image.src = url;
    void image.decode().catch(() => { decoded.delete(url); }).finally(() => {
      active--;
      while (decoded.size > 8) decoded.delete(decoded.keys().next().value!);
      drain();
    });
  }
}
