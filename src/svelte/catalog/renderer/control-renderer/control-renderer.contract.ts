// Stub contract of ControlRenderer.svelte (migration debt): its `host` prop is a LocalFileHost, a class with a private
// `#handles` field. Contract props reach a piece through DeepReadonly, which maps the class to a plain object without that
// private field, so the value is no longer a LocalFileHost for the node renderer. The entry keeps its own props type.
export const ControlRendererContract = {} as const;
