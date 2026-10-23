export type ModuleReferenceKind = "object" | "dependency" | "journey" | "view" | "destination" | "command";
declare const referenceContract: unique symbol;

/** The SDK issues references; their contract is type information, not a public implementation. */
export type ModuleReference<K extends ModuleReferenceKind, Owner extends string = string, Id extends string = string, Contract = object> =
  Readonly<{ kind: K; owner: Owner; id: Id; [referenceContract]: Contract }>;
export type ReferenceContract<R> = R extends ModuleReference<ModuleReferenceKind, string, string, infer C> ? C : never;
