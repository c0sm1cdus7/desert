// Escribe un nombre con mayúscula inicial sin cambiar el resto.
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
