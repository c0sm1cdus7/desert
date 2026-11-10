export const toolLimits = { text: 160, label: 40, minOptions: 2, maxOptions: 4, minText: 1 } as const;
export const snapshotEvery = 100;
export const privateFileMode = 0o600;
export const privateDirectoryMode = 0o700;
/** How much of a tool's text view a reader takes at once. */
export type ViewLimits = Readonly<{ recentLines: number }>;
/** A shorter value is no secret worth hiding: replacing it everywhere would rewrite ordinary words. */
export const secretLimits = { minLength: 12 } as const;
