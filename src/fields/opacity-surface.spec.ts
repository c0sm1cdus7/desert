import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { asking } from "../surface/bridge/questions/asking.ts";
import { questionWords } from "../surface/bridge/questions/asking-clock.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { fixture, ref, field } from "../../tests/support/secret-rig.ts";
import { holding, when, text } from "./fields.ts";
const words = questionWords(() => 1000, shopShown, "es");
it("the question is secret, and holding and when receive only references", () => {
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
it("the question entry hands the material only to the base", () => {
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

it("an action's confirms and stops receive references before running", async () => {
  const { walked } = await import("../surface/bridge/acts/asked-act.ts");
  const { opacityProgram } = await import("../../tests/support/opacity-program.ts");
  const { staged } = await import("../checks/promises/promised-stage.ts");
  const { localPorts } = await import("../runtime/house-runtime.ts");
  const seen: unknown[] = [];
  const program = opacityProgram(undefined, undefined, seen);
  const act = program.registry.find(tool => tool.id === "vault")?.acts.set;
  if (!act) throw new Error("Missing action");
  await staged(program, ({ house }) => {
    const ports = localPorts(house(), "ana", { recentLines: 20 });
    const walkedAct = walked(
      { ...ports, language: "es" as const, act: value => ports.act(value, 0) },
      { tool: "vault", name: "set", act },
      { ...shopShown, day: undefined, things: () => undefined, titled: () => "Material" },
    );
    walkedAct.walk.stops(["ONE\nTWO", "OTHER"], "vault");
    walkedAct.walk.next(["ONE\nTWO", "OTHER"], "vault");
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every(input => ref(field(input, "first")) && ref(field(input, "second")))).toBe(true);
    expect(JSON.stringify(seen)).not.toContain("ONE");
    return Promise.resolve();
  });
});

it("cancelling leaves no redeemable material in the references callbacks saw", () => {
  const input = Type.Object({ value: Type.String({ secret: true, title: "Material", maxLength: 4 }) });
  const ask = asking(input, words);
  const visible = ask.input(["datum"]);
  const rig = fixture(input);
  // Replaying a callback's object is external material: its reference text exceeds this field's bound.
  expect(rig.set(visible).status).toBe("rejected");
});

it("P3: the confirmation defect can only copy the reference it received", async () => {
  const { walked } = await import("../surface/bridge/acts/asked-act.ts");
  const { opacityProgram } = await import("../../tests/support/opacity-program.ts");
  const { staged } = await import("../checks/promises/promised-stage.ts");
  const { localPorts } = await import("../runtime/house-runtime.ts");
  const program = opacityProgram();
  const base = program.registry.find(tool => tool.id === "vault")?.acts.set;
  if (!base) throw new Error("Missing action");
  await staged(program, ({ house }) => {
    const ports = localPorts(house(), "ana", { recentLines: 20 });
    const act = {
      ...base,
      confirms: (input: unknown): string => {
        throw new Error(String(field(input, "first")));
      },
    };
    const question = walked(
      { ...ports, language: "es" as const, act: value => ports.act(value, 0) },
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
      question.walk.next(["DEFECT_MATERIAL", "OTHER"], "vault");
    } catch (error) {
      failed = true;
      ports.defect(error, "vault", "vault", "set");
    }
    expect(failed).toBe(true);
    const facts = house().journal.replay<unknown[]>([], (all, event) => [...all, event]);
    expect(JSON.stringify(facts)).not.toContain("DEFECT_MATERIAL");
    expect(JSON.stringify(facts)).toContain("secret:");
    return Promise.resolve();
  });
});

it("two equal positions get distinct references when confirming too", () => {
  const value = Type.String({ secret: true, title: "Material", maxLength: 10 });
  const ask = asking(Type.Object({ first: value, second: value }), words);
  const input = ask.input(["same", "same"]);
  expect(ref(field(input, "first")) && ref(field(input, "second"))).toBe(true);
  expect(field(input, "first")).not.toBe(field(input, "second"));
  expect(ask.input(["same", "same"])).toEqual(input);
});
