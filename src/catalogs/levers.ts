export const toolLimits = { text: 160, label: 40, minOptions: 2, maxOptions: 4, minText: 1 } as const;
export const snapshotEvery = 100;
export const privateFileMode = 0o600;
export const privateDirectoryMode = 0o700;
/** How much of a tool's text view a reader takes at once. */
export type ViewLimits = Readonly<{ recentLines: number }> &
  /** The instant of the reading, for what a tool reads by the day: what is due today. */
  Readonly<{ now: number }>;

/** Bump whenever the base changes how its own facts fold. */
export const baseProjectionVersion = "desert/4";

/** Bounded descriptions: one shared scene and a part for each identity. */
export const sceneLimits = { general: 4000, each: 1000, identities: 64, name: 160 } as const;
/** Local house wire: equality includes the complete Node version because state uses v8 serialization. */
export const houseProtocolVersion = 1;
export const socketLimits = { json: 1024 * 1024, state: 16 * 1024 * 1024, helloMs: 5000, drainMs: 10_000 } as const;
