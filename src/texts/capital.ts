// Writes a name with an initial capital letter without changing the rest.
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
