/** Renderer-owned content identity, independent of chrome and device names. */
export interface PlaceIdentity {
  title: string;
  subtitle: string;
  media?: { kind: 'image'; asset: string; alt: string } | { kind: 'video'; asset: string; alt: string; poster?: string }
    | { kind: 'gallery'; images: readonly { asset: string; alt: string }[] };
}

