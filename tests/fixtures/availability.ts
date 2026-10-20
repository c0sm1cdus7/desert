import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { NotebookLocal, NotebookService, NotebookWeb } from "../../products/notebook/distributions.ts";

export function localPlan() {
  const plan = compile(Notebook).planDistributions([NotebookLocal])[0]!;
  if (plan.kind !== "client") throw new Error("Expected client plan");
  return plan;
}

export function remotePlan() {
  const plan = compile(Notebook).planDistributions([NotebookService, NotebookWeb])[1]!;
  if (plan.kind !== "client") throw new Error("Expected client plan");
  return plan;
}

export function mixedPlan() {
  const source = structuredClone(Notebook) as any;
  source.dependencies.push({ id: "archive-link", kind: "capability", requires: [] });
  source.journeys[2].requires.dependencies = ["archive-link"];
  const service = { id: "archive-server", kind: "controller", product: "notebook", runtime: "node",
    storage: "postgresql", serves: ["human"], provides: ["archive-link"] };
  const client = { ...NotebookLocal, bindings: [...NotebookLocal.bindings,
    { dependency: "archive-link", kind: "remote", service: "archive-server" }] };
  const plan = compile(source).planDistributions([service, client])[1]!;
  if (plan.kind !== "client") throw new Error("Expected client plan");
  return plan;
}

export function manualClock() {
  let time = 0;
  const pending = new Map<number, { at: number, callback: () => void }>();
  let nextId = 0;
  return {
    now: () => time,
    schedule(callback: () => void, delay: number) {
      const id = ++nextId;
      pending.set(id, { at: time + delay, callback });
      return () => { pending.delete(id); };
    },
    advance(milliseconds: number) {
      time += milliseconds;
      for (const [id, task] of [...pending]) if (task.at <= time) {
        pending.delete(id);
        task.callback();
      }
    },
    pending: () => pending.size,
  };
}
