import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { asking } from "../surface/bridge/questions/asking.ts";
import { questionWords } from "../surface/bridge/questions/asking-clock.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { fixture, ref, field } from "../../tests/support/secret-rig.ts";
import { holding, when, text } from "./fields.ts";
const words = questionWords(() => 1000, shopShown);
it("la pregunta es secreta y holding y when solo reciben referencias", () => {
  const seen: unknown[] = [];
  const input = Type.Object({
    value: holding(
      Type.String({ secret: true, title: "Material", placeholder: "Material", maxLength: 4000 }),
      value => {
        seen.push(value);
        return undefined;
      },
    ),
    after: when(text("Nombre", "Nombre"), answers => {
      seen.push(answers.value);
      return true;
    }),
  });
  const ask = asking(input, words);
  expect(ask.next([])?.kind).toBe("secret");
  ask.next([])?.wrong?.("dato\npegado");
  ask.next(["dato\npegado"]);
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every(ref)).toBe(true);
});
it("la entrada de preguntas transfiere el material solo a la base", () => {
  const input = Type.Object({
    value: Type.String({ secret: true, title: "Material", placeholder: "Material", maxLength: 4, minLength: 2 }),
  });
  const ask = asking(input, words);
  const answered = ask.submit([" xx "]);
  expect(ref(field(answered, "value"))).toBe(true);
  let received: unknown;
  const rig = fixture(input, value => {
    received = field(value, "value");
    return { status: "accepted" };
  });
  expect(rig.set(answered).status).toBe("accepted");
  expect(ref(received)).toBe(true);
});

it("confirms y stops de una acción reciben referencias antes de ejecutar", async () => {
  const { walked } = await import("../surface/bridge/acts/asked-act.ts");
  const { opacityProgram } = await import("../../tests/support/opacity-program.ts");
  const { staged } = await import("../checks/promises/promised-stage.ts");
  const { localPorts } = await import("../runtime/house-runtime.ts");
  const seen: unknown[] = [];
  const program = opacityProgram(undefined, undefined, seen);
  const act = program.registry.find(tool => tool.id === "vault")?.acts.set;
  if (!act) throw new Error("Falta acción");
  await staged(program, ({ house }) => {
    const ports = localPorts(house(), "ana", { recentLines: 20 });
    const walkedAct = walked(
      { ...ports, act: value => ports.act(value, 0) },
      { tool: "vault", name: "set", act },
      { ...shopShown, day: undefined, things: () => undefined, titled: () => "Material" },
    );
    walkedAct.walk.stops(["UNO\nDOS", "OTRO"], "vault");
    walkedAct.walk.next(["UNO\nDOS", "OTRO"], "vault");
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every(input => ref(field(input, "first")) && ref(field(input, "second")))).toBe(true);
    expect(JSON.stringify(seen)).not.toContain("UNO");
    return Promise.resolve();
  });
});

it("cancelar no deja material canjeable en las referencias vistas por callbacks", () => {
  const input = Type.Object({ value: Type.String({ secret: true, title: "Material", maxLength: 4 }) });
  const ask = asking(input, words);
  const visible = ask.input(["datum"]);
  const rig = fixture(input);
  // Replaying a callback's object is external material: its reference text exceeds this field's bound.
  expect(rig.set(visible).status).toBe("rejected");
});

it("P3: el defecto de confirmación solo puede copiar la referencia recibida", async () => {
  const { walked } = await import("../surface/bridge/acts/asked-act.ts");
  const { opacityProgram } = await import("../../tests/support/opacity-program.ts");
  const { staged } = await import("../checks/promises/promised-stage.ts");
  const { localPorts } = await import("../runtime/house-runtime.ts");
  const program = opacityProgram();
  const base = program.registry.find(tool => tool.id === "vault")?.acts.set;
  if (!base) throw new Error("Falta acción");
  await staged(program, ({ house }) => {
    const ports = localPorts(house(), "ana", { recentLines: 20 });
    const act = {
      ...base,
      confirms: (input: unknown): string => {
        throw new Error(String(field(input, "first")));
      },
    };
    const question = walked(
      { ...ports, act: value => ports.act(value, 0) },
      { tool: "vault", name: "set", act },
      {
        ...shopShown,
        day: undefined,
        things: () => undefined,
        titled: () => "Material",
      },
    );
    let failed = false;
    try {
      question.walk.next(["MATERIAL_DEL_DEFECTO", "OTRO"], "vault");
    } catch (error) {
      failed = true;
      ports.defect(error, "vault", "vault", "set");
    }
    expect(failed).toBe(true);
    const facts = house().journal.replay<unknown[]>([], (all, event) => [...all, event]);
    expect(JSON.stringify(facts)).not.toContain("MATERIAL_DEL_DEFECTO");
    expect(JSON.stringify(facts)).toContain("secret:");
    return Promise.resolve();
  });
});

it("dos posiciones iguales tienen referencias distintas también al confirmar", () => {
  const value = Type.String({ secret: true, title: "Material", maxLength: 10 });
  const ask = asking(Type.Object({ first: value, second: value }), words);
  const input = ask.input(["igual", "igual"]);
  expect(ref(field(input, "first")) && ref(field(input, "second"))).toBe(true);
  expect(field(input, "first")).not.toBe(field(input, "second"));
  expect(ask.input(["igual", "igual"])).toEqual(input);
});
