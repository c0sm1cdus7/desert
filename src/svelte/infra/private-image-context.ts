import { getContext, setContext } from "svelte";
import type { PrivateImages } from "../../web/client/private-images.ts";

const privateImages = Symbol("desert.private-images");

export function providePrivateImages(images: PrivateImages): void {
  setContext(privateImages, images);
}

export function usePrivateImages(): PrivateImages | undefined {
  return getContext<PrivateImages | undefined>(privateImages);
}
