// Declares the languages available for the house's messages.
export const languages = ["es"] as const;
export type Language = (typeof languages)[number];
