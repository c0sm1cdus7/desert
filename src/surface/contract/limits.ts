// The bounds every door keeps alike, in one place: how much of one paste is kept, how long a row's identity is.
/** How much of one paste is kept: what comes past it is left out. */
export const pasteLimit = 100_000;
/** How long a row's identity may be, in UTF-16 units: a longer one is a defect, never cut. */
export const rowIdLimit = 1_024;
