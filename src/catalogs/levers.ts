export const toolLimits = { text: 160, label: 40, minOptions: 2, maxOptions: 4, minText: 1 } as const;
export const snapshotEvery = 100;
export const privateFileMode = 0o600;
export const privateDirectoryMode = 0o700;
/** How much of a tool's text view a reader takes at once. */
export type ViewLimits = Readonly<{ recentLines: number }> &
  /** The instant of the reading, for what a tool reads by the day: what is due today. */
  Readonly<{ now: number }>;

/** Bump whenever the base changes how its own facts fold. */
export const baseProjectionVersion = "desert/1";
