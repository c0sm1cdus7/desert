// What a model card can do besides writing: see images and hear audio.
export const capabilities = ["sees", "hears"] as const;
export type Capability = (typeof capabilities)[number];
