// Escribe un nombre con mayúscula inicial sin cambiar el resto.
/** A name as the bar says it: with a capital. */
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
