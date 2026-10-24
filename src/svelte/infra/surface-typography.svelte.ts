import { getContext, setContext } from 'svelte';

const typographyKey = Symbol('desert.surface-typography');
type Density = () => 'comfortable' | 'compact';
/** The density utility of the theme for each density, written literally so the Tailwind scan of the theme sees both. */
export const densityClass = Object.freeze({ comfortable: "density-comfortable", compact: "density-compact" } as const);
/** Portals retain their owning layout's type roles, regardless of window width. */
export function provideSurfaceTypography(density: Density): void { setContext(typographyKey, density); }
export function useSurfaceTypography(): () => ReturnType<Density> | undefined {
  return getContext<Density | undefined>(typographyKey) ?? (() => undefined);
}
/** The density class of the layout a portal was launched from, for an owner to put on the portalled surface it draws. */
export function useSurfaceDensityClass(): () => string | undefined {
  const density = useSurfaceTypography();
  return () => { const value = density(); return value && densityClass[value]; };
}
