import { effect } from "../../../house/facts.ts";
import { afterEach, expect, it } from "vitest";
import { shopRig } from "../../../../tests/support/shop-rig.ts";
import { salesTool } from "../../../../tests/support/shop.ts";
import { noticesOf } from "./notices.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

it("11: directs a need only to its holder, while undirected needs still reach all holders", () => {
  const rig = shopRig({ grants: { ana: ["sales"], beto: ["sales"], carla: [] } });
  rigs.push(rig);
  const tool = {
    ...salesTool,
    needs: () => [
      { target: "sales", why: "Para Ana", to: "ana" },
      { target: "sales/s1", why: "Para Beto", to: "beto" },
      { target: "sales", why: "Para Carla", to: "carla" },
      { target: "sales", why: "Para todos" },
    ],
  };
  const read = (me: string) => {
    const ports = rig.ports(me, () => 0);
    return noticesOf({ ...ports, act: value => ports.act(value, 0) }, tool, {
      name: "Ventas",
      titleOf: () => "Venta 1",
    }).notices().needs;
  };
  expect(read("ana")).toEqual([
    { title: "Ventas", detail: "Para Ana" },
    { title: "Ventas", detail: "Para Carla" },
    { title: "Ventas", detail: "Para todos" },
  ]);
  expect(read("beto")).toEqual([
    { title: "Venta 1", detail: "Para Beto", opens: "sales/s1" },
    { title: "Ventas", detail: "Para Carla" },
    { title: "Ventas", detail: "Para todos" },
  ]);
  expect(read("carla")).toEqual([]);
  expect(read("outsider")).toEqual([]);
});

it.each(["nadie", "mind:sales", "carla"])("shows a need for %s to all holders instead of dropping it", to => {
  const rig = shopRig({ grants: { ana: ["sales"], beto: ["sales"], carla: [] } });
  rigs.push(rig);
  const tool = { ...salesTool, needs: () => [{ target: "sales", why: "Pendiente", to }] };
  const read = (me: string) => {
    const ports = rig.ports(me, () => 0);
    return noticesOf({ ...ports, act: value => ports.act(value, 0) }, tool, { name: "Ventas" }).notices().needs;
  };
  for (const me of ["ana", "beto"]) expect(read(me)).toEqual([{ title: "Ventas", detail: "Pendiente" }]);
  for (const me of ["carla", "nadie", "mind:sales"]) expect(read(me)).toEqual([]);
});

it("reassigns Attention as its recipient loses, regains and leaves the tool across restart", () => {
  const rig = shopRig();
  rigs.push(rig);
  const tool = { ...salesTool, needs: () => [{ target: "sales", why: "Pendiente", to: "beto" }] };
  const read = (me: string) => {
    const ports = rig.ports(me, () => 0);
    return noticesOf({ ...ports, act: value => ports.act(value, 0) }, tool, { name: "Ventas" }).notices().needs;
  };
  expect(read("ana")).toEqual([]);
  expect(read("beto")).toHaveLength(1);
  rig.bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
  rig.restart();
  expect(read("ana")).toHaveLength(1);
  expect(read("beto")).toEqual([]);
  rig.bus.emit(effect("granted", { identity: "beto", tools: ["sales"] }, "ana"));
  expect(read("ana")).toEqual([]);
  expect(read("beto")).toHaveLength(1);
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(read("ana")).toHaveLength(1);
  expect(read("beto")).toEqual([]);
});

it("a manually supplied mind grant cannot hide a need from identities", () => {
  const rig = shopRig();
  rigs.push(rig);
  const ports = rig.ports("ana", () => 0);
  const state = ports.state();
  const house = { ...state.house, grants: new Map(state.house.grants).set("mind:sales", ["sales"]) };
  const tool = { ...salesTool, needs: () => [{ target: "sales", why: "Pendiente", to: "mind:sales" }] };
  const notices = noticesOf({ ...ports, state: () => ({ ...state, house }), act: value => ports.act(value, 0) }, tool, {
    name: "Ventas",
  });
  expect(notices.notices().needs).toEqual([{ title: "Ventas", detail: "Pendiente" }]);
});
