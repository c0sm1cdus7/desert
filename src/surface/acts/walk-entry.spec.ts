// A written field says which keys it asks for, and a secret says it is one: every format of the catalog, every entry.
import { describe, expect, it } from "vitest";
import type { Field, Screen } from "../contract/contract.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { formats, limited, padded, shaped, type Format } from "../formats/masks.ts";
import { resolve } from "../router/resolve.ts";
import { begin, type Session } from "../session/screen.ts";
import { startTalk } from "../session/talk.ts";

const bar = { state: "connected", clock: "14:32", now: 5_000 } as const;
const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
/** A tool whose one act asks one question: the one given. */
function asking(field: Field): Tool {
  return {
    id: "ask",
    name: "Pregunta",
    place: { key: "p", section: "tools" },
    summary: () => "",
    view: () => [],
    acts: {
      one: {
        label: "preguntar",
        verb: "responder",
        scope: "all",
        next: answers => (answers.length ? null : field),
        run: () => Promise.resolve({ ok: true, text: "Listo." }),
      },
    },
  };
}
function entryOf(screen: Screen) {
  if (screen.body.kind !== "thread" || !screen.body.entry) throw new Error("no entry on this screen");
  return screen.body.entry;
}
const asked = (field: Field) => {
  const tools = [asking(field)];
  const session: Session = [{ kind: "menu", at: 0 }, begin(tools, "ask", "one")];
  return entryOf(resolve(session, tools, bar, { rows: 40 }));
};
const catalog: readonly (readonly [string, Format])[] = [
  ...Object.entries(formats(locale)),
  ["shaped", shaped(["##-########-#"])],
  ["padded", padded(4)],
  ["limited", limited("A-Z", 3, "tres letras")],
];

describe("the keys an entry asks for", () => {
  it("holds every keyboard there is in the catalog, decimal among them", () => {
    expect(new Set(catalog.map(([, format]) => format.keyboard))).toEqual(new Set(["digits", "decimal", "text"]));
  });
  it.each(catalog)("asks for the keyboard of the %s format, and says no secret", (_, format) => {
    const entry = asked({ kind: "text", ask: "¿Cuánto?", mask: format });
    expect(entry.keyboard).toBe(format.keyboard);
    expect(entry).not.toHaveProperty("secret");
  });
  it("asks for text where a question has a placeholder", () => {
    const entry = asked({ kind: "text", ask: "¿Qué?", placeholder: "Lo que sea" });
    expect(entry.keyboard).toBe("text");
    expect(entry).not.toHaveProperty("secret");
  });
  it("asks for text where a secret is written, and says it is one", () => {
    const entry = asked({ kind: "secret", ask: "Clave" });
    expect(entry.keyboard).toBe("text");
    expect(entry.secret).toBe(true);
  });
  it("asks for text in a conversation, and says no secret", () => {
    const tool: Tool = {
      ...asking({ kind: "secret", ask: "Clave" }),
      conversation: {
        said: () => [],
        live: () => null,
        send: () => Promise.resolve(undefined),
        open: () => ({ title: "", lines: [] }),
      },
    };
    const session: Session = [{ kind: "menu", at: 0 }, startTalk("ask")];
    const entry = entryOf(resolve(session, [tool], bar, { rows: 40 }));
    expect(entry.keyboard).toBe("text");
    expect(entry).not.toHaveProperty("secret");
  });
});
