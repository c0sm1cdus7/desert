// Stub contract of PlaceContent.svelte (migration debt): its `host` prop is a LocalFileHost, a class with a private
// `#handles` field, which it hands on to each Stack. Contract props reach a piece through DeepReadonly, which maps the
// class to a plain object without that private field, so the value is no longer a LocalFileHost for Stack. The entry keeps
// its own props type until that is resolved (same debt as stack and control-renderer).
export const PlaceContentContract = {} as const;
