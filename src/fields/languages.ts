// Declares the languages every text is written in, and the one the house operates in.
export const languages = ["en", "es"] as const;
export type Language = (typeof languages)[number];
/** The house works in English: what minds read, what code routes on and what facts keep as an id. */
export const workingLanguage: Language = "en";
export const isLanguage = (value: unknown): value is Language => languages.some(language => language === value);
