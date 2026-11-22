// Tools for the specs that touch rows: what the golden tools never show, a question in a conversation and a new thing.
import type { Said, Tool, ToolAct } from "../../src/surface/contract/shown-tool.ts";

/** A conversation that asks one question: one answer is off, and «other» can be written. */
function asking(): Tool {
  const said: Said[] = [{ id: "q", who: [{ text: "Nora", tone: "being" }], text: "¿Seguimos mañana?" }];
  let answered = false;
  return {
    id: "asks",
    name: "Preguntas",
    place: { key: "p", section: "tools" },
    summary: () => "una pregunta",
    view: () => [],
    acts: {},
    conversation: {
      said: () => said,
      live: () => null,
      send: text => {
        said.push({ id: `m${said.length}`, who: [{ text: "Vos", tone: "t1" }], text });
        answered = true;
        return Promise.resolve(undefined);
      },
      pending: () =>
        answered
          ? null
          : {
              id: "q",
              options: [{ title: "sí" }, { title: "no", detail: "ya no se puede", off: true }, { title: "a la tarde" }],
            },
      open: () => ({ title: "", lines: [] }),
    },
  };
}
type Box = { readonly id: string; readonly title: string };
/** Keeps a thing in a box: the box is picked, or a new one is made to answer the question. */
const keeping = (kept: readonly Box[]): ToolAct => ({
  label: "guardar",
  verb: "guardar",
  key: "g",
  scope: "all",
  next: answers =>
    answers.length
      ? null
      : {
          kind: "pick",
          of: "boxes",
          ask: "¿En qué caja?",
          found: sought => [
            ...kept.filter(box => box.title.includes(sought)).map(box => ({ title: box.title, value: box.id })),
            { key: "n", title: "caja nueva", makes: { tool: "boxes", act: "make" } },
          ],
          shown: id => kept.find(box => box.id === id)?.title ?? id,
          nothing: () => "Sin cajas",
        },
  run: () => Promise.resolve({ ok: true, text: "Guardado." }),
});
/** Makes a box, and says which one it made. */
const making = (kept: Box[]): ToolAct => ({
  label: "caja nueva",
  verb: "crear",
  key: "n",
  scope: "row",
  next: answers => (answers.length ? null : { kind: "text", ask: "¿Qué caja?", placeholder: "Color de la caja" }),
  run: ([title]) => {
    kept.push({ id: `b${kept.length + 1}`, title: title ?? "" });
    return Promise.resolve({ ok: true, text: "Creada.", made: `b${kept.length}` });
  },
});
/** An act that cannot be done now: it stays on the list, off. */
const closed: ToolAct = {
  label: "cerrar",
  verb: "cerrar",
  key: "c",
  scope: "all",
  off: () => "no hay nada abierto",
  next: () => null,
  run: () => Promise.resolve({ ok: true, text: "Cerrado." }),
};
/** Boxes: an act that picks one, among which a new one can be made, an act that is off, and a search. */
function boxes(): Tool {
  const kept: Box[] = [{ id: "b1", title: "Caja azul" }];
  return {
    id: "boxes",
    name: "Cajas",
    place: { key: "c", section: "tools" },
    summary: () => `${kept.length} cajas`,
    view: () => [{ title: "Cajas", rows: kept.map(box => ({ title: box.title })) }],
    /** Whatever is looked for, every box is found: the walk types only a few letters. */
    find: () => kept.map(box => ({ title: box.title, detail: "caja", opens: box.id })),
    acts: { pickOne: keeping(kept), make: making(kept), closed },
  };
}
/** A new set, so one path never sees what another one made or answered. */
export const pointedTools = (): readonly Tool[] => [asking(), boxes()];
