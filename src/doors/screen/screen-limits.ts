// The bounds of the screen door in one typed constant: what a browser and the door both read, with no import.
export const screenLimits = {
  /** A session with no client attached and no request for this long is closed. */
  idleMs: 1_800_000,
  /** Intents in one batch a client sends. */
  batch: 64,
  /** The most rows a client may say it has. */
  rows: 500,
  /** Clients of one session at once: the house's own bound of channels per key (socketLimits.waits). */
  clients: 8,
  /** How many past screens of each client keep what an Enter meant on them. */
  revs: 64,
  /** How often a silent stream says it is still there, as the socket door does. */
  keepaliveMs: 15_000,
} as const;
