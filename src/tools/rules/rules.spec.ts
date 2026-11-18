// Las acciones de Reglas guardan, aprueban, simulan y retiran sin borrar ni repetir un acto.
import { afterEach, expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { rulesTool } from "./rules.ts";
import { toolAct } from "../act-definition.ts";
import type { RuleDefinition } from "../../house/rules/rule-schema.ts";
import { rulesTexts as words } from "../../texts/rules.texts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
const close: (() => void)[] = [];
afterEach(() => close.splice(0).forEach(stop => stop()));
export const limit: RuleDefinition = {
  id: "limit",
  text: "No pasar de diez",
  action: { tool: "probe", act: "send" },
  condition: { operator: "gt", field: { source: "input", path: "amount" }, value: 10 },
  effect: "frena",
};
function fixture() {
  let sent = 0;
  const schema = Type.Object({ amount: Type.Number() });
  const registry = [
    ...shopRegistry,
    {
      id: "probe",
      purpose: "Prueba",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        send: toolAct<Shop, typeof schema>(
          schema,
          () => {
            sent++;
            return { status: "accepted" };
          },
          "world",
        ),
      },
    },
  ];
  const rig = shopRig({ registry: [...registry, rulesTool(registry)] });
  close.push(rig.close);
  for (const by of ["ana", "beto"]) for (const target of ["rules", "probe"]) rig.attend(by, target);
  const act = (option: string, input: unknown, by = "ana") => settle(rig.act(by, option, input, "rules"));
  const send = (by = "ana", amount = 11) => settle(rig.act(by, "send", { amount }, "probe"));
  return { rig, act, send, sent: () => sent };
}
it("lo del admin vale al guardar; lo de otro sigue borrador hasta aprobar y nunca se borra", async () => {
  const f = fixture();
  expect((await f.act("save", limit)).status).toBe("accepted");
  for (const by of ["ana", "beto"])
    expect(await f.send(by)).toMatchObject({ status: "rejected", reason: words.blocked });
  const relaxed = { ...limit, condition: { ...limit.condition, value: 20 } };
  expect((await f.act("propose", relaxed, "beto")).status).toBe("accepted");
  expect((await f.send()).status).toBe("rejected");
  expect((await f.act("approve", { id: "limit", version: 2 })).status).toBe("accepted");
  expect(f.sent()).toBe(0);
  expect((await f.send()).status).toBe("accepted");
  expect((await f.act("retire", { id: "limit", version: 2 })).status).toBe("accepted");
  f.rig.restart();
  expect(f.rig.state().house.rules.versions.get("limit")?.length).toBe(2);
  expect(f.rig.state().house.rules.active.size).toBe(0);
  const history = await f.act("consult", {});
  expect(history.value).toMatchObject([{ id: "limit", active: null, versions: [{ version: 1 }, { version: 2 }] }]);
});
it("una propuesta del admin también entra en vigencia al guardarla; otro no guarda, aprueba ni retira", async () => {
  const f = fixture();
  expect((await f.act("propose", limit)).status).toBe("accepted");
  expect((await f.send()).status).toBe("rejected");
  for (const option of ["save", "approve", "retire"])
    expect((await f.act(option, option === "save" ? limit : { id: "limit", version: 1 }, "beto")).status).toBe(
      "rejected",
    );
  expect(f.rig.state().house.rules.active.get("limit")).toBe(1);
});
it("simular muestra los casos que pasan y frenan, sin efectos ni nuevas versiones", async () => {
  const f = fixture();
  await f.act("propose", limit, "beto");
  const result = await f.act("simulate", {
    id: "limit",
    version: 1,
    samples: JSON.stringify([9, 11].map(amount => ({ actor: "ana", now: 0, input: { amount } }))),
  });
  expect(result).toMatchObject({ status: "accepted", value: [{ outcome: "passed" }, { outcome: "frena" }] });
  expect(f.sent()).toBe(0);
  expect(f.rig.state().house.rules.active.size).toBe(0);
});
it("sin supervisor espera con aviso y no deja que otra regla que pasa lo autorice", async () => {
  const f = fixture();
  await f.act("save", { ...limit, effect: "requiere-supervisor" });
  expect(await f.send()).toMatchObject({ status: "rejected", reason: words.waiting });
  expect(f.rig.state().entries.at(-1)?.data).toMatchObject({ text: words.waiting, attention: true });
  await f.act("save", { ...limit, id: "block" });
  expect(await f.send()).toMatchObject({ status: "rejected", reason: words.blocked });
  expect(f.sent()).toBe(0);
});
it("rechaza código, rutas ajenas y condiciones mal tipadas al guardar por el ejecutor", async () => {
  const f = fixture();
  for (const condition of [
    { operator: "eval", source: "process.exit()" },
    { operator: "gt", field: { source: "input", path: "other.secret" }, value: 10 },
    { operator: "gt", field: { source: "input", path: "constructor.name" }, value: 10 },
    { operator: "gt", field: { source: "input", path: "amount" }, value: "10" },
  ])
    expect((await f.act("save", { ...limit, condition })).status).toBe("rejected");
  expect(f.rig.state().house.rules.versions.size).toBe(0);
});
it("no permite alterar una versión leída ni aprobar otra vez una versión retirada", async () => {
  const f = fixture();
  await f.act("save", limit);
  const version = f.rig.state().house.rules.versions.get("limit")?.[0];
  expect(() => Object.assign(version?.definition ?? {}, { text: "Cambio" })).toThrow();
  await f.act("retire", { id: "limit", version: 1 });
  expect((await f.act("approve", { id: "limit", version: 1 })).status).toBe("rejected");
  f.rig.restart();
  expect(f.rig.state().house.rules.versions.get("limit")?.[0]?.definition.text).toBe(limit.text);
});
it("dos borradores conservan autores y secuencia; aprobar uno no publica el otro", async () => {
  const f = fixture();
  await f.act("save", limit);
  const proposals = [20, 30].map(value =>
    f.act(
      "propose",
      {
        ...limit,
        condition: { ...limit.condition, value },
      },
      "beto",
    ),
  );
  expect((await Promise.all(proposals)).map(result => result.status)).toEqual(["accepted", "accepted"]);
  expect(f.rig.state().house.rules.active.get("limit")).toBe(1);
  await f.act("approve", { id: "limit", version: 2 });
  f.rig.restart();
  expect(
    f.rig
      .state()
      .house.rules.versions.get("limit")
      ?.map(({ version, author }) => [version, author]),
  ).toEqual([
    [1, "ana"],
    [2, "beto"],
    [3, "beto"],
  ]);
  expect(f.rig.state().house.rules.active.get("limit")).toBe(2);
  expect((await f.send("ana", 25)).status).toBe("rejected");
  expect(f.sent()).toBe(0);
});
