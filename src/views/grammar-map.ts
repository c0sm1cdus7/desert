// Which authorable composition draws each piece of the View grammar: every `Components.X` key and every kind of the
// `ViewContent`/`ViewItem` unions (src/views/schema.ts). The catalog gate reads this file as data (rule K,
// GRAMMAR_NOT_IN_CATALOG) and never evaluates it; slice 5 generates it from the declarations.
// No composition is `authorable: true` yet, so no entry is truthful today: every key and kind is still to be mapped.
export const grammarMap = {} as const;
