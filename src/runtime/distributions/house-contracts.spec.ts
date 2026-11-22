import "../../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { compose } from "./compose.ts";
import { startHouse } from "../house-runtime.ts";
import { home, time } from "../../../tests/support/upgrade-support.ts";
import { contractOptions, type Demo } from "../../../tests/support/distribution-contracts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { input } from "../../../tests/support/contract-packages.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { ActResult } from "../../tools/tool-contract.ts";

function setup(override?: () => ActResult<Demo> | Promise<ActResult<Demo>>) {
  const path = home();
  const { program } = compose(contractOptions);
  const registry = program.registry.map(tool => {
    const action = tool.acts["fiscal/issue"];
    return override && action
      ? {
          ...tool,
          acts: {
            ...tool.acts,
            "fiscal/issue": {
              ...toolAct<Demo, ReturnType<typeof input>>(input(), override),
              folder: "documents/fiscal",
              on: "thing" as const,
            },
          },
        }
      : tool;
  });
  const options = {
    ...program,
    registry,
    by: "demo",
    creation: {
      admin: "ana",
      assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["sales", "documents"] })),
    },
  };
  const open = () => startHouse(path, options, time);
  const house = open();
  for (const target of ["sales/billing", "documents/fiscal"])
    house.tools.act({ act: "attend", input: { target } }, 0, "beto");
  return {
    house,
    open,
    act: (sale = "v1") =>
      house.tools.act({ act: "billing/invoice", target: "sales/billing", input: { sale } }, 0, "beto"),
  };
}
it("executes certified contracts through startHouse and preserves their receipts on reopen", async () => {
  const rig = setup();
  try {
    expect((await settle(rig.act())).value).toEqual({ status: "accepted", value: { id: "v1" } });
    expect(rig.house.tools.state().tools.documents.fiscal.get("v1")).toMatchObject({ number: "1" });
    const events = rig.house.journal.replay<import("../../journal/vocabulary.ts").Event<Demo["fact"]>[]>(
      [],
      (all, event) => [...all, event],
    );
    const consumer = events.find(e => e.kind === "act" && e.data.option === "billing/invoice");
    const provider = events.find(e => e.kind === "act" && e.data.option === "fiscal/issue");
    expect(provider?.cause).toContain(consumer?.id);
    expect(events.find(e => e.kind === "documents/issued")?.cause).toContain(provider?.id);
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "documents/issued",
        by: "beto",
      }),
    );
  } finally {
    rig.house.close();
  }
  const reopened = rig.open();
  try {
    expect(reopened.tools.state().tools.documents.fiscal.get("v1")).toMatchObject({ number: "1" });
    const read = await settle(
      reopened.tools.act({ act: "billing/read", target: "sales/billing", input: { sale: "v1" } }, 0, "beto"),
    );
    expect(read.value).toMatchObject({
      reading: { status: "found", value: { number: "1", state: "issued" } },
      notices: [{ author: "beto", value: { sale: "v1", voucher: "v1" } }],
    });
    expect(JSON.stringify(read.value)).not.toContain("privado");
  } finally {
    reopened.close();
  }
});
it("preserves business refusal through the public opening", async () => {
  const rig = setup();
  try {
    expect((await settle(rig.act("invalid"))).value).toEqual({ status: "rejected", value: { code: "invalida" } });
  } finally {
    rig.house.close();
  }
});
it("preserves inconclusive provider results", async () => {
  const rig = setup(() => ({ status: "inconclusive" }));
  try {
    expect((await settle(rig.act())).value).toEqual({ status: "core-failure", reason: "inconclusive" });
  } finally {
    rig.house.close();
  }
});
it.each(["revoke", "close"])("interrupts a provider waiting during %s", async mode => {
  let finish: ((result: ActResult<Demo>) => void) | undefined;
  const rig = setup(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  try {
    const pending = rig.act();
    expect(pending.status).toBe("processing");
    if (mode === "close") rig.house.close();
    else
      rig.house.bus.emit(
        effect(
          "kit-set",
          { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "sales" }] } },
          "ana",
        ),
      );
    finish?.({
      status: "accepted",
      value: { id: "v1", number: "1" },
      effects: [
        {
          layer: "program",
          kind: "documents/issued",
          data: { sale: "v1", voucher: "v1" },
          by: "beto",
          cause: [],
        },
      ],
    });
    const result = await settle(pending);
    if (mode === "close") expect(result.status).toBe("interrupted");
    else expect(result.value).toEqual({ status: "core-failure", reason: "interrupted" });
  } finally {
    rig.house.close();
  }
  const reopened = rig.open();
  try {
    expect(reopened.tools.state().tools.documents.fiscal.size).toBe(0);
    if (mode === "close")
      expect(
        reopened.journal.replay<number>(
          0,
          (count, event) => count + Number(event.kind === "act-result" && event.data.status === "interrupted"),
        ),
      ).toBe(2);
  } finally {
    reopened.close();
  }
});

it("refuses revoked provider permissions before dispatch", async () => {
  const rig = setup();
  try {
    rig.house.bus.emit(
      effect(
        "kit-set",
        { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "sales" }] } },
        "ana",
      ),
    );
    expect((await settle(rig.act())).value).toEqual({ status: "core-failure", reason: "forbidden" });
    expect(rig.house.tools.state().tools.documents.fiscal.size).toBe(0);
  } finally {
    rig.house.close();
  }
});
it("rejects a certified declaration whose installed executor is missing", () => {
  const [sales, documents] = contractOptions.programs;
  const missing = {
    ...documents,
    install: () => {
      const installed = documents.install();
      return { ...installed, tool: { ...installed.tool, acts: {} } };
    },
  };
  expect(() => compose({ ...contractOptions, programs: [sales, missing] })).toThrow();
});
