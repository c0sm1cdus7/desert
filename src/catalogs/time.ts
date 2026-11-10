export const toolReminderLadder = { firstMs: 60_000, maxMs: 3_600_000, multiplier: 2 } as const;
export const maxTimerDelayMs = 2_147_483_647;
/** How often a screen that shows time passing is drawn again. */
export const redrawMs = 400;
/** Every case of a program happens at this one instant, so what it promises to read does not depend on the day. */
export const caseInstant = Date.UTC(2026, 0, 15, 15, 0);
