// Lo que una carta puede hacer además de escribir: ver imágenes y oír audio.
export const capabilities = ["sees", "hears"] as const;
export type Capability = (typeof capabilities)[number];
