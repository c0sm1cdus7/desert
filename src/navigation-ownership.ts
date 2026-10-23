const surfaceNavigationKeys = ["navigation", "entry", "primaryAction", "subjectActions"] as const;

export type WithoutSurfaceNavigation = {
  readonly [Key in typeof surfaceNavigationKeys[number]]?: never;
};

export function requireProgramOwnedNavigation(surface: object): void {
  if (surfaceNavigationKeys.some(key => Object.hasOwn(surface, key))) {
    throw new Error("DUPLICATE_NAVIGATION_OWNER");
  }
}
