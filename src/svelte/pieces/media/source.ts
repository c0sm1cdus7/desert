import type { MediaItem } from '../../../views/media-library.ts';
import type { AssetReference } from '../../../assets/types.ts';
export type ImageSource = string | AssetReference;
export type Photo = Readonly<{ source: ImageSource; alt: string }>;
type PublicPhoto = Readonly<{ source: string; alt: string }>;
export type ViewerMedia = Readonly<
  { kind: 'image'; source: ImageSource; alt: string } |
  { kind: 'video' | 'audio'; source: ImageSource; alt: string; artwork?: PublicPhoto;
    captions: readonly { source: string; language: string; label: string }[] }
>;
export const mediaSource = (asset: string) => `/media/${encodeURIComponent(asset)}`;
export const imageIdentity = (source: ImageSource) => typeof source === 'string' ? source : `private:${source.reference}`;
export const catalogPhotos = (images: readonly { asset: string; alt: string }[]): Photo[] =>
  images.map(image => ({ source: mediaSource(image.asset), alt: image.alt }));
export const viewerMedia = (items: readonly MediaItem[]): ViewerMedia[] => items.map(item => item.kind === 'image'
  ? { kind: 'image', source: mediaSource(item.image.asset), alt: item.image.alt }
  : { kind: item.kind, source: mediaSource(item.source.asset), alt: item.title,
      ...(item.artwork ? { artwork: { source: mediaSource(item.artwork.asset), alt: item.artwork.alt } } : {}),
      captions: (item.captions ?? []).map(track => ({ ...track, source: mediaSource(track.asset) })) });
export function imageSource(source: string, edge: number) {
  if (!/^\/media\/[^/?#]+$/.test(source) || source.endsWith(".svg")) return source;
  const bucket = [160, 320, 640, 1280, 1920, 2560].find(size => size >= edge) ?? 2560;
  return `${source}?w=${bucket}`;
}

const pending = new Set<string>(), decoded = new Map<string, HTMLImageElement>();
let active = 0;
/** Intent/neighbor warming only: at most two requests, four queued, eight decoded photos. */
export function prefetchImage(source: ImageSource, edge: number) {
  if (typeof source !== 'string' || !source.startsWith('/media/')) return;
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
