// Rule J's arithmetic: which state × variant combinations a declaration asks specimens for. `stateVariants` limits a state
// to some values of an axis; `variantLimits` lets one axis value limit another axis, an empty list removing that axis.
export type Axes = Readonly<Record<string, readonly string[]>>;
export type Variants = Readonly<Record<string, string>>;
export type StateVariants = Readonly<Record<string, Axes>>;
export type VariantLimits = Readonly<Record<string, Readonly<Record<string, Axes>>>>;
export type Coverage = Readonly<{ states: readonly string[]; axes: Axes; only: StateVariants; limits: VariantLimits }>;

/** Ledger key of one specimen: `<state>|<axis>=<value>,…` with axes sorted, or `<state>` alone. */
export function specimenKey(state: string, variants: Variants): string {
  const pairs = Object.keys(variants).sort().map(axis => `${axis}=${variants[axis]}`);
  return pairs.length ? `${state}|${pairs.join(",")}` : state;
}

/** The axes the values of `variants` remove, each with the `axis=value` that removes it. */
export function removedAxes(variants: Variants, limits: VariantLimits): ReadonlyMap<string, string> {
  const removed = new Map<string, string>();
  for (const [axis, value] of Object.entries(variants)) for (const [other, values] of Object.entries(limits[axis]?.[value] ?? {})) {
    if (!values.length) removed.set(other, `${axis}=${value}`);
  }
  return removed;
}

/** Whether every value of `variants` that limits `axis` allows `value` there. */
const allows = (variants: Variants, limits: VariantLimits, axis: string, value: string) =>
  Object.entries(variants).every(([other, by]) => limits[other]?.[by]?.[axis]?.includes(value) ?? true);

/** The combination with the axes its values remove dropped, or undefined when a value refuses another. */
function admitted(variants: Variants, limits: VariantLimits): Variants | undefined {
  const removed = removedAxes(variants, limits), kept: Record<string, string> = {};
  for (const [axis, value] of Object.entries(variants)) {
    if (removed.has(axis)) continue;
    if (!allows(variants, limits, axis, value)) return undefined;
    kept[axis] = value;
  }
  return kept;
}

/** Every specimen key the declaration asks for. */
export function combinations({ states, axes, only, limits }: Coverage): readonly string[] {
  const keys = new Set<string>();
  for (const state of states) {
    let partial: readonly Variants[] = [{}];
    for (const [axis, values] of Object.entries(axes)) {
      const allowed = values.filter(value => only[state]?.[axis]?.includes(value) ?? true);
      partial = partial.flatMap(variants => allowed.map(value => ({ ...variants, [axis]: value })));
    }
    for (const variants of partial) {
      const kept = admitted(variants, limits);
      if (kept) keys.add(specimenKey(state, kept));
    }
  }
  return [...keys];
}

/** stateVariants restricts declared states to declared axis values only. */
export function restrictionNames(states: readonly string[], axes: Axes, only: StateVariants): readonly string[] {
  return Object.entries(only).flatMap(([state, restricted]) => [
    ...states.includes(state) ? [] : [`stateVariants names undeclared state ${state}`],
    ...Object.entries(restricted).flatMap(([axis, values]) => !axes[axis] ? [`stateVariants.${state} names undeclared axis ${axis}`]
      : values.filter(value => !axes[axis]?.includes(value)).map(value => `stateVariants.${state} names undeclared value ${value} of axis ${axis}`)),
  ]);
}

/** What is wrong with one limit `axis=value → other: values`, or undefined when it names declared things only. */
function limitProblem(axes: Axes, axis: string, value: string, other: string, values: readonly string[]): string | undefined {
  const where = `variantLimits.${axis}.${value}`;
  if (other === axis) return `${where} limits its own axis ${axis}`;
  if (!axes[other]) return `${where} names undeclared axis ${other}`;
  const unknown = values.find(item => !axes[other]?.includes(item));
  return unknown === undefined ? undefined : `${where} names undeclared value ${unknown} of axis ${other}`;
}

/** The declared part of variantLimits, and a name for each part that is not declared (that part limits nothing). */
export function declaredLimits(axes: Axes, limits: VariantLimits): Readonly<{ limits: VariantLimits; problems: readonly string[] }> {
  const kept: Record<string, Record<string, Record<string, readonly string[]>>> = {}, problems: string[] = [];
  for (const [axis, byValue] of Object.entries(limits)) {
    if (!axes[axis]) { problems.push(`variantLimits names undeclared axis ${axis}`); continue; }
    for (const [value, limited] of Object.entries(byValue)) {
      if (!axes[axis]?.includes(value)) { problems.push(`variantLimits.${axis} names undeclared value ${value}`); continue; }
      for (const [other, values] of Object.entries(limited)) {
        const problem = limitProblem(axes, axis, value, other, values);
        if (problem) problems.push(problem);
        else ((kept[axis] ??= {})[value] ??= {})[other] = values;
      }
    }
  }
  return { limits: kept, problems };
}
