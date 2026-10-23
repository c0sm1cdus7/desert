export const renditionWidths = [160, 320, 640, 1280, 1920, 2560] as const;
export type RenditionWidth = (typeof renditionWidths)[number];
export const imageInputPixelLimit = 80_000_000;
