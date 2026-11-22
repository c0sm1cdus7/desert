// What the money matrix expects on screen after each state receives each event.
import type { MatrixEvent, MatrixState } from "./money-matrix-seat.ts";
type Expected = {
  entry: string | undefined;
  amount: string;
  reasons: string[];
  phase: string;
  pos: number;
  place: string;
  currency: string;
};
const baseReasons: Partial<Record<MatrixState, string>> = {
  missing: "falta completar",
  minimum: "mínimo $ 0,01",
  "digits-only": "solo números",
  "currency-changed": "cambió la moneda",
  "program-held": "importe retenido",
  failed: "Error el proveedor no respondió",
};
const rawOf = (state: MatrixState): string => {
  if (["empty", "missing", "currency-changed"].includes(state)) return "";
  if (["zero", "minimum"].includes(state)) return "0";
  return state === "cap" ? "9999999999999" : "500";
};
const formatted = (raw: string, currency: string): string => {
  if (!raw) return "";
  const padded = raw.padStart(3, "0");
  return `${currency} ${padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${padded.slice(-2)}`;
};
const rejection: Partial<Record<MatrixEvent, string>> = {
  space: "sin espacios",
  minus: "sin signo",
  plus: "sin signo",
  comma: "solo números",
  dot: "solo números",
  letter: "solo números",
  paste: "sin signo",
};
function editing(state: MatrixState, event: MatrixEvent, want: Expected): Expected {
  let raw = rawOf(state);
  const before = raw;
  let reason = rejection[event];
  if (event === "erase") raw = raw.slice(0, -1);
  if (["digit", "zero", "paste"].includes(event)) {
    const typed = event === "zero" ? "0" : "7";
    const digits = event === "paste" ? "123456" : typed;
    for (const digit of digits) {
      if (raw.length === 13) reason ??= `máximo ${want.currency} 99.999.999.999,99`;
      else if (raw === "0" && digit === "0") reason ??= "cero inicial descartado";
      else raw = String(Number(raw + digit));
    }
  }
  if (raw !== before) want.reasons = [];
  if (event === "Enter") {
    if (!raw) want.reasons = [...new Set([...want.reasons, "falta completar"])];
    else if (raw === "0") want.reasons = [`mínimo ${want.currency} 0,01`];
    else if (state !== "program-held")
      return { ...want, phase: "running", pos: 1, entry: undefined, reasons: [], place: "Procesando" };
  }
  if (reason && !want.reasons.includes(reason)) want.reasons.push(reason);
  return { ...want, amount: raw, entry: formatted(raw, want.currency) };
}
export function expectedMatrix(state: MatrixState, event: MatrixEvent): Expected {
  const reason = baseReasons[state];
  const want: Expected = {
    entry: formatted(rawOf(state), "$"),
    amount: rawOf(state),
    reasons: reason ? [reason] : [],
    phase: "asking",
    pos: 0,
    place: "Importe",
    currency: state === "currency-changed" ? "US$" : "$",
  };
  if (state === "in-flight" || state === "finished") {
    const done = state === "finished" || event === "ok";
    if (state === "in-flight" && event === "Error")
      return { ...want, entry: "$ 5,00", reasons: ["Error el proveedor no respondió"] };
    return {
      ...want,
      phase: done ? "done" : "running",
      pos: 1,
      entry: undefined,
      place: done ? "Listo" : "Procesando",
    };
  }
  if (["currency", "round-trip", "other-person"].includes(event)) return currencyChanged(state, event, want);
  if (state === "confirmation")
    return {
      ...want,
      entry: undefined,
      pos: event === "Enter" ? 2 : 1,
      phase: event === "Enter" ? "running" : "asking",
      place: event === "Enter" ? "Procesando" : "Confirmar importe",
    };
  if (state === "later-field") return later(event, want);
  return editing(state, event, want);
}

function later(event: MatrixEvent, want: Expected): Expected {
  const written: Partial<Record<MatrixEvent, string>> = {
    digit: "7",
    zero: "0",
    minus: "-",
    plus: "+",
    comma: ",",
    dot: ".",
    letter: "x",
    paste: "-1.234,56",
  };
  const reasons = event === "space" ? ["sin espacios al principio ni dobles"] : [];
  if (event === "Enter") reasons.push("falta completar");
  return { ...want, entry: written[event] ?? "", pos: 1, place: "Nota", reasons };
}

function currencyChanged(state: MatrixState, event: MatrixEvent, want: Expected): Expected {
  want.currency = event === "round-trip" ? "$" : "US$";
  if (state === "minimum") want.reasons = ["falta completar"];
  if (state === "program-held") want.reasons = [];
  if (!want.reasons.includes("cambió la moneda")) want.reasons.push("cambió la moneda");
  return { ...want, amount: "", entry: "" };
}
