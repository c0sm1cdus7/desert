// Hand-built screens for what the walk never reaches, so the frozen frames and the bank's rules see every form.
import type { Hint, Row, Screen } from "../../src/surface/contract/contract.ts";

const moving: readonly Hint[] = [
  { intent: "move", does: "elegir" },
  { intent: "confirm", does: "abrir" },
];
const base = { title: "Prueba", state: "connected", clock: "10:42", hints: moving, menu: true } as const;
const rows: readonly Row[] = [
  { key: "1", title: "Cobrar" },
  { key: "12", title: "Una clave de dos caracteres", detail: "larga" },
  { key: "3", title: "Anular", detail: "ya está anulada", off: true },
  { key: "4", title: "Apagada sin motivo", off: true },
  { title: "Sin detalle apagada", off: true },
  { title: "Total", detail: "$ 1.500,00", still: true, tone: "ok" },
  { title: "Sin dato", still: true, tone: "cut" },
  { title: "Elegida", detail: "hoy", selected: true },
];
const odd: readonly Row[] = [
  { key: "1", title: "Café 漢字 ancho", detail: "絵" },
  { key: "2", title: "Con\tcontrol\u0007", detail: "a\u001bb" },
];
const lines = [
  {
    spans: [
      { text: "▇▇▇▇▇", tone: "d1" },
      { text: " ventas", tone: "t2" },
    ],
    title: "",
  },
  {
    spans: [
      { text: "▇▇", tone: "d2", bold: true },
      { text: " compras", tone: "t3", rgb: { fg: "#ff8800" } },
    ],
    title: "",
  },
] as const satisfies readonly Row[];
const event = { text: [{ text: "Un evento", tone: "t1" }] } as const;

/** Every screen here is a value written by hand, named by what it shows. */
export const paintedScreens: readonly Readonly<{ name: string; screen: Screen }>[] = [
  {
    name: "focus",
    screen: {
      ...base,
      body: { kind: "focus", title: "Hola", lines: [[{ text: "Escribí para empezar", tone: "t2" }], []] },
    },
  },
  {
    name: "rows of every kind",
    screen: {
      ...base,
      body: {
        kind: "list",
        stacks: [
          { title: "Acciones", rows, above: 2, below: 3 },
          { title: "Datos", reads: true, rows: [...rows.slice(5), { title: "Leído", detail: "dato" }] },
          { title: "Vacía", empty: "Nada todavía", rows: [] },
          { title: "Vacía sin texto", rows: [] },
          { title: "Gráfico", rows: lines },
        ],
      },
    },
  },
  {
    name: "wide and control characters",
    screen: {
      ...base,
      title: "Título 漢字\u0007 con\tcontrol",
      body: {
        kind: "list",
        stacks: [
          { title: "Raras", rows: odd },
          { title: "Escrita", rows: [{ title: "Nombre", entry: { typed: "Ana 漢", caret: 4 }, selected: true }] },
          { title: "", rows: [{ title: "", entry: { typed: "", caret: 0 } }] },
        ],
      },
    },
  },
  {
    name: "thread with wide and control characters",
    screen: {
      ...base,
      body: {
        kind: "thread",
        events: [
          {
            head: [{ text: "Ana 漢", tone: "being", bold: true }],
            text: [{ text: "Hola\u0007 漢字\tmundo", tone: "t1" }],
          },
          { ...event, quote: "una cita larga que se corta", nested: true },
        ],
      },
    },
  },
  {
    name: "muted event with a selected attachment",
    screen: {
      ...base,
      body: {
        kind: "thread",
        events: [
          event,
          {
            head: [{ text: "Bruno", tone: "t2", rgb: { fg: "#00ff00" } }],
            text: [{ text: "Apagado", tone: "t1", bold: true }],
            attachments: [
              { title: "Factura", detail: "A 0001", selected: true },
              { title: "Recibo", detail: "B 0002" },
            ],
            muted: true,
          },
          { ...event, selected: true, attachments: [{ title: "Nota", detail: "abierta" }] },
        ],
        reference: "Referencia de la pregunta",
      },
    },
  },
  ...entries(),
  ...states(),
  ...panels(),
];
/** A written entry with what fills its shape: padding, the rest of its mask, and what was there when it opened. */
function entries(): Readonly<{ name: string; screen: Screen }>[] {
  const thread = (entry: Extract<Screen["body"], { kind: "thread" }>["entry"]): Screen => ({
    ...base,
    body: { kind: "thread", events: [event], ...(entry ? { entry } : {}) },
  });
  return [
    { name: "entry with padding", screen: thread({ typed: "0001", caret: 4, placeholder: "", padding: 3 }) },
    { name: "entry with remaining", screen: thread({ typed: "12/", caret: 3, placeholder: "", remaining: "mm/aaaa" }) },
    { name: "entry caret inside", screen: thread({ typed: "abc", caret: 1, placeholder: "", remaining: "de" }) },
    { name: "entry suggested", screen: thread({ typed: "Hoy", caret: 3, placeholder: "", suggested: true }) },
    {
      name: "entry suggested with padding",
      screen: thread({ typed: "0005", caret: 4, placeholder: "", padding: 2, suggested: true, remaining: "x" }),
    },
    { name: "entry placeholder", screen: thread({ typed: "", caret: 0, placeholder: "Escribí acá" }) },
    { name: "entry wide", screen: thread({ typed: "漢字a", caret: 2, placeholder: "", remaining: "漢" }) },
  ];
}
/** The three states other than connected, one with a battery. */
function states(): Readonly<{ name: string; screen: Screen }>[] {
  const list = { kind: "list", stacks: [{ title: "Acciones", rows: rows.slice(0, 2) }] } as const;
  return [
    { name: "connecting with battery", screen: { ...base, state: "connecting", battery: "80%", body: list } },
    { name: "signal lost", screen: { ...base, state: "signal-lost", menu: false, body: list } },
    { name: "disconnected", screen: { ...base, state: "disconnected", hints: [], body: list } },
  ];
}
/** What opened beside, focused, unfocused and full. */
function panels(): Readonly<{ name: string; screen: Screen }>[] {
  const body = { kind: "list", stacks: [{ title: "Acciones", rows }] } as const;
  const panel = {
    title: "Detalle 漢",
    detail: "3 de 4",
    lines: [[{ text: "Primera línea", tone: "t1" }], [], [{ text: "Tercera", tone: "d3", bold: true }]],
    top: 0,
  } as const;
  const hints: readonly Hint[] = [
    ...moving,
    { intent: "switch", does: "cambiar" },
    { intent: "full", does: "ampliar" },
  ];
  return [
    { name: "panel focused", screen: { ...base, hints, body, panel: { ...panel, focused: true, full: false } } },
    { name: "panel unfocused", screen: { ...base, hints, body, panel: { ...panel, focused: false, full: false } } },
    { name: "panel full", screen: { ...base, hints, body, panel: { ...panel, focused: true, full: true, top: 1 } } },
    {
      name: "panel without detail",
      screen: { ...base, body, panel: { title: "Solo", lines: [], focused: false, full: false, top: 0 } },
    },
  ];
}
