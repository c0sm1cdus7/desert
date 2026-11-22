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
  "falta completar": "falta completar",
  mínimo: "mínimo $ 0,01",
  "solo números": "solo números",
  "cambió la moneda": "cambió la moneda",
  defineProgram: "importe retenido",
  Error: "Error el proveedor no respondió",
};
const rawOf = (state: MatrixState): string => {
  if (["vacío", "falta completar", "cambió la moneda"].includes(state)) return "";
  if (["cero", "mínimo"].includes(state)) return "0";
  return state === "tope" ? "9999999999999" : "500";
};
const formatted = (raw: string, currency: string): string => {
  if (!raw) return "";
  const padded = raw.padStart(3, "0");
  return `${currency} ${padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${padded.slice(-2)}`;
};
const rejection: Partial<Record<MatrixEvent, string>> = {
  espacio: "sin espacios",
  menos: "sin signo",
  más: "sin signo",
  coma: "solo números",
  punto: "solo números",
  letra: "solo números",
  pegado: "sin signo",
};
function editing(state: MatrixState, event: MatrixEvent, want: Expected): Expected {
  let raw = rawOf(state);
  const before = raw;
  let reason = rejection[event];
  if (event === "borrar") raw = raw.slice(0, -1);
  if (["dígito", "cero", "pegado"].includes(event)) {
    const typed = event === "cero" ? "0" : "7";
    const digits = event === "pegado" ? "123456" : typed;
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
    else if (state !== "defineProgram")
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
    currency: state === "cambió la moneda" ? "US$" : "$",
  };
  if (state === "en vuelo" || state === "terminada") {
    const done = state === "terminada" || event === "bien";
    if (state === "en vuelo" && event === "Error")
      return { ...want, entry: "$ 5,00", reasons: ["Error el proveedor no respondió"] };
    return {
      ...want,
      phase: done ? "done" : "running",
      pos: 1,
      entry: undefined,
      place: done ? "Listo" : "Procesando",
    };
  }
  if (["moneda", "ida y vuelta", "otra persona"].includes(event)) return currencyChanged(state, event, want);
  if (state === "confirmación")
    return {
      ...want,
      entry: undefined,
      pos: event === "Enter" ? 2 : 1,
      phase: event === "Enter" ? "running" : "asking",
      place: event === "Enter" ? "Procesando" : "Confirmar importe",
    };
  if (state === "más adelante") return later(event, want);
  return editing(state, event, want);
}

function later(event: MatrixEvent, want: Expected): Expected {
  const written: Partial<Record<MatrixEvent, string>> = {
    dígito: "7",
    cero: "0",
    menos: "-",
    más: "+",
    coma: ",",
    punto: ".",
    letra: "x",
    pegado: "-1.234,56",
  };
  const reasons = event === "espacio" ? ["sin espacios al principio ni dobles"] : [];
  if (event === "Enter") reasons.push("falta completar");
  return { ...want, entry: written[event] ?? "", pos: 1, place: "Nota", reasons };
}

function currencyChanged(state: MatrixState, event: MatrixEvent, want: Expected): Expected {
  want.currency = event === "ida y vuelta" ? "$" : "US$";
  if (state === "mínimo") want.reasons = ["falta completar"];
  if (state === "defineProgram") want.reasons = [];
  if (!want.reasons.includes("cambió la moneda")) want.reasons.push("cambió la moneda");
  return { ...want, amount: "", entry: "" };
}
