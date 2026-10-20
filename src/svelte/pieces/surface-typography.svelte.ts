import { getContext, setContext } from 'svelte';

const typographyKey = Symbol('desert.surface-typography');
type Density = () => 'comfortable' | 'compact';
/** Portals retain their owning layout's type roles, regardless of window width. */
export function provideSurfaceTypography(density: Density): void { setContext(typographyKey, density); }
export function useSurfaceTypography(): () => ReturnType<Density> | undefined {
  return getContext<Density | undefined>(typographyKey) ?? (() => undefined);
}
