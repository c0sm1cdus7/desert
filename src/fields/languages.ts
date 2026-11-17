// Declara los idiomas disponibles para los mensajes de la casa.
export const languages = ["es"] as const;
export type Language = (typeof languages)[number];
