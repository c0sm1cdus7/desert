// A tool's own act named read reaches the tool; only the house's read act brings a page.
import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { applyActs } from "./turn-acts.ts";
import type { TurnPorts } from "./mind-ports.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
it("applies a tool's act named read through the tool, and serves the house's read from its page", async () => {
  const input = Type.Object({});
  const menu = [
    { tool: "libros", act: "read", target: "libros/1", input, scope: "work" as const },
    { tool: "mind", act: "read", target: "Actividad", input, scope: "read" as const },
  ];
  const execute = vi.fn(() => Promise.resolve({ status: "accepted" as const, id: "act-1" }));
  const page = vi.fn(() => "lo anterior");
  const ports: TurnPorts = {
    frame: () => ({ tooLarge: true }),
    model: () => Promise.resolve({ kind: "uncertain" }),
    read: () => ({ active: true, menu, through: 1, rulesVersion: "v", now: 0 }),
    isOpen: () => true,
    allowed: () => true,
    supervision: {},
    emit: () => undefined,
    execute,
    page,
  };
  const review: ReviewPort = {
    review: () => ({ proposal: "p", through: 1, rulesVersion: "v", outcome: "passed", text: "" }),
  };
  const turn: TurnContext = {
    id: "t",
    scope: { kind: "journey", actor: "mind:libros", process: "j", kit: [] },
    language: "es",
    wake: [],
    through: 1,
    limits: turnLimits,
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const acts = [
    { act: "read", target: "libros/1", input: {} },
    { act: "read", target: "Actividad", input: { from: 0 } },
  ];
  const applied: string[] = [];
  const done = await applyActs({ ports, turn, review }, { scene: "", consulta: null, acts }, "v", applied);
  expect(execute).toHaveBeenCalledOnce();
  expect(page).toHaveBeenCalledOnce();
  expect(applied).toEqual(["act-1"]);
  expect(done).toMatchObject({ reports: [{ status: "accepted" }, { status: "accepted", page: "lo anterior" }] });
});
