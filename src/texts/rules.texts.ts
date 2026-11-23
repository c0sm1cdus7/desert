// Shared words of Rules: their conditions, versions, and acts that require supervision.
import type { Phrase } from "../fields/phrases.ts";
export const rulesTexts = {
  reserved: { en: "Rules belongs to the core and is not granted", es: "Reglas es del core y no se otorga" },
  example: { en: "Example", es: "Ejemplo" },
  purpose: {
    en: "Propose, consult and test the house's rules",
    es: "Proponer, consultar y probar las reglas de la casa",
  },
  invalid: { en: "invalid condition", es: "condición inválida" },
  action: { en: "nonexistent action", es: "acción inexistente" },
  field: { en: "field not public or outside the schema", es: "campo no público o fuera del esquema" },
  type: { en: "value incompatible with the field", es: "valor incompatible con el campo" },
  only: { en: "only whoever administers", es: "solo quien administra" },
  missing: { en: "nonexistent version", es: "versión inexistente" },
  approved: { en: "version already approved", es: "versión ya aprobada" },
  inactive: { en: "version not in force", es: "versión no vigente" },
  saveNotice: { en: "On saving, the rule is in force", es: "Al guardar, la regla queda vigente" },
  proposalNotice: {
    en: "The proposal awaits approval; the previous version stays in force",
    es: "La propuesta espera aprobación; sigue vigente la versión anterior",
  },
  authorityChanged: {
    en: "Whoever administers changed; the change is proposed again from Rules",
    es: "Cambió quién administra; volvé a Reglas para proponer el cambio",
  },
  saved: { en: "Saved · Rule in force", es: "Guardada · Regla vigente" },
  draft: { en: "Proposed · Draft rule; awaits approval", es: "Propuesta · Regla en borrador; espera aprobación" },
  activated: {
    en: "Approved · Rule in force; each mind decides how to go on",
    es: "Aprobada · Regla vigente; cada mente decide cómo seguir",
  },
  retired: { en: "Retired · Rule; its history stays available", es: "Retirada · Regla; su historia sigue disponible" },
  consulted: (reading: string) => ({ en: `Consulted · Rules\n${reading}`, es: `Consultadas · Reglas\n${reading}` }),
  simulationResult: (reading: string) => ({ en: `Simulated · Rule\n${reading}`, es: `Simulada · Regla\n${reading}` }),
  blocked: { en: "The act was stopped by a mechanical rule", es: "El acto quedó frenado por una regla mecánica" },
  waiting: {
    en: "Requires supervision and the house has no supervisor: the act was not done and is not retried on its own",
    es: "Requiere supervisión y la casa no tiene supervisor: el acto no se hizo y no se repite solo",
  },
  starting: {
    en:
      "Requires supervision and the supervisor has not started yet: " +
      "the act was not done and is not retried on its own",
    es: "Requiere supervisión y el supervisor todavía no arrancó: el acto no se hizo y no se repite solo",
  },
  reaction: {
    en: "Requires supervision and a reaction does not wait for the supervisor: the act was not done",
    es: "Requiere supervisión y una reacción no espera al supervisor: el acto no se hizo",
  },
  /** What an act that requires supervision gets when the supervisor rejects it, or gives no verdict. */
  verdict: (outcome: "rejected" | "failed", detail: string) =>
    outcome === "rejected"
      ? { en: `Rejected by the supervisor: ${detail}`, es: `Rechazado por el supervisor: ${detail}` }
      : {
          en:
            `Requires supervision and the supervisor gave no verdict (${detail}): ` +
            "the act was not done and is not retried on its own",
          es:
            `Requiere supervisión y el supervisor no dio su veredicto (${detail}): ` +
            "el acto no se hizo y no se repite solo",
        },
  name: { en: "Rules", es: "Reglas" },
  empty: { en: "No rules yet", es: "Todavía no hay reglas" },
  history: { en: "Versions", es: "Versiones" },
  propose: {
    name: { en: "propose", es: "proponer" },
    enter: { en: "propose", es: "proponer" },
    key: "p",
    purpose: { en: "save a rule proposal", es: "guardar una propuesta de regla" },
  },
  save: {
    name: { en: "save", es: "guardar" },
    enter: { en: "save", es: "guardar" },
    key: "g",
    purpose: { en: "save a rule in force", es: "guardar una regla vigente" },
  },
  approve: {
    name: { en: "approve", es: "aprobar" },
    enter: { en: "approve", es: "aprobar" },
    key: "a",
    purpose: { en: "put a draft in force", es: "poner en vigencia un borrador" },
  },
  retire: {
    name: { en: "retire", es: "retirar" },
    enter: { en: "retire", es: "retirar" },
    key: "r",
    purpose: { en: "set aside the version in force", es: "retirar la versión vigente sin borrarla" },
  },
  consult: {
    name: { en: "consult", es: "consultar" },
    enter: { en: "consult", es: "consultar" },
    key: "c",
    purpose: { en: "every version and whether it is in force", es: "leer todas las versiones y su vigencia" },
  },
  simulate: {
    name: { en: "simulate", es: "simular" },
    enter: { en: "simulate", es: "simular" },
    key: "s",
    purpose: { en: "test a rule without running the act", es: "probar una regla sin ejecutar el acto" },
  },
};
export const ruleFormTexts = {
  field: { en: "Datum", es: "Dato" },
  example: { en: "Value", es: "Valor" },
  yes: { en: "Yes", es: "Sí" },
  no: { en: "No", es: "No" },
  fields: {
    id: { en: "Identifier", es: "Identificador" },
    text: { en: "What it guards", es: "Qué cuida" },
    tool: { en: "Program", es: "Programa" },
    act: { en: "Action", es: "Acción" },
    action: { en: "Action", es: "Acción" },
    condition: { en: "Condition", es: "Condición" },
    conditions: { en: "Conditions", es: "Condiciones" },
    operator: { en: "Operator", es: "Operador" },
    field: { en: "Field", es: "Campo" },
    source: { en: "Source", es: "Origen" },
    path: { en: "Declared field", es: "Campo declarado" },
    value: { en: "Value", es: "Valor" },
    values: { en: "Values", es: "Valores" },
    kind: { en: "Kind", es: "Tipo" },
    effect: { en: "Result", es: "Resultado" },
    from: { en: "From minute", es: "Desde el minuto" },
    until: { en: "Until minute", es: "Hasta el minuto" },
    offsetMinutes: { en: "Offset from UTC in minutes", es: "Diferencia con UTC en minutos" },
    days: { en: "Days, from Sunday (0) to Saturday (6)", es: "Días, de domingo (0) a sábado (6)" },
    version: { en: "Version", es: "Versión" },
  } satisfies Readonly<Record<string, Phrase>>,
  options: {
    equal: { title: { en: "Equality", es: "Igualdad" }, key: "e" },
    in: { title: { en: "Membership", es: "Pertenencia" }, key: "p" },
    gt: { title: { en: "Greater", es: "Mayor" }, key: "m" },
    gte: { title: { en: "Greater or equal", es: "Mayor o igual" }, key: "g" },
    lt: { title: { en: "Less", es: "Menor" }, key: "n" },
    lte: { title: { en: "Less or equal", es: "Menor o igual" }, key: "l" },
    actor: { title: { en: "Actor", es: "Actor" }, key: "a" },
    schedule: { title: { en: "Schedule", es: "Horario" }, key: "h" },
    all: { title: { en: "All", es: "Todas" }, key: "t" },
    any: { title: { en: "Any", es: "Alguna" }, key: "u" },
    not: { title: { en: "Does not hold", es: "No cumple" }, key: "o" },
    input: { title: { en: "Input", es: "Entrada" }, key: "e" },
    core: { title: { en: "House", es: "Casa" }, key: "c" },
    text: { title: { en: "Text", es: "Texto" }, key: "t" },
    number: { title: { en: "Number", es: "Número" }, key: "n" },
    boolean: { title: { en: "Truth", es: "Verdad" }, key: "v" },
    null: { title: { en: "Null", es: "Nulo" }, key: "u" },
    identity: { title: { en: "Identity", es: "Identidad" }, key: "i" },
    program: { title: { en: "Program mind", es: "Mente de programa" }, key: "p" },
    assistant: { title: { en: "Assistant", es: "Asistente" }, key: "a" },
    block: { title: { en: "Stops", es: "Frena" }, key: "f" },
    "require-supervisor": { title: { en: "Requires supervision", es: "Requiere supervisión" }, key: "s" },
    always: { title: { en: "At all times", es: "Siempre" }, key: "s" },
    admin: { title: { en: "Administrator", es: "Administrador" }, key: "d" },
    actorKind: { title: { en: "Actor kind", es: "Tipo de actor" }, key: "t" },
    isAdmin: { title: { en: "Is administrator", es: "Es administrador" }, key: "e" },
    inJourney: { title: { en: "In a journey", es: "En un journey" }, key: "j" },
  },
  more: {
    ask: { en: "Another value", es: "Otro valor" },
    done: { title: { en: "Done", es: "Listo" }, key: "l" },
    another: { title: { en: "Add", es: "Agregar" }, key: "a" },
  },
  samples: { en: "Public cases in JSON, without secret fields", es: "Casos públicos en JSON, sin campos secretos" },
  unavailable: { en: "faithful simulation not available", es: "simulación fiel no disponible" },
  sample: '[{"actor":"ana","input":{},"now":0}]',
  casesInvalid: { en: "invalid simulation cases", es: "casos de simulación inválidos" },
} as const;
