// Reproduces the auditor's two-house spending paths with real turns and synthetic model responses.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { maximumProgramCall } from "./program-mind-availability.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import { openModelSpendingAccount } from "./model-spending-account.ts";
import { billingAccount } from "./mind-billing.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const folders: string[] = [];
function fixture() {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
}
function resources() {
  const folder = mkdtempSync(join(tmpdir(), "shared-budget-"));
  folders.push(folder);
  return { capNanoUsd: 10e9, spendingAccount: { file: join(folder, "models.sqlite"), openingNanoUsd: 1.02e9 } };
}
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
  vi.unstubAllGlobals();
});
const thinking = { "mind:notes": { model: "claude-fable-5-2", effort: "high" } };
async function think(f: ReturnType<typeof fixture>, house: Awaited<ReturnType<ReturnType<typeof fixture>["open"]>>) {
  f.wake(house);
  await (await house.minds)?.flush();
}
function synthetic() {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                scene: "No hay novedades.",
                acts: [],
                consultation: null,
              }),
            },
          ],
          usage: { input_tokens: 10, output_tokens: 16000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        }),
      ),
    ),
  );
}
it("shares the total across two fresh houses, reopening and reconstruction like cap-two-houses", async () => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network.forbidden");
  });
  const settings = { ...resources(), cards: thinking };
  const transport = synthetic();
  const first = fixture();
  const house = await first.open({ ...settings, transport });
  expect(transport).not.toHaveBeenCalled();
  await think(first, house);
  expect(transport).toHaveBeenCalledOnce();
  expect(modelAccount(house.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(0);
  house.close();

  const rebuilt = await first.open({ ...settings, transport }, true, "rebuilt/2");
  await think(first, rebuilt);
  expect(transport).toHaveBeenCalledTimes(2);
  rebuilt.close();
  rmSync(first.home, { recursive: true });
  let exhausted = false;
  let home = first.home;
  for (let index = 0; index < 20 && !exhausted; index++) {
    const before = transport.mock.calls.length;
    const next = fixture();
    home = next.home;
    const fresh = await next.open({ ...settings, transport });
    await think(next, fresh);
    exhausted = before === transport.mock.calls.length;
    const said = [...(fresh.mindNotices?.() ?? []), fresh.tools.state().house.scenes.get("mind:notes")?.data.general];
    expect(said.join(" ").includes("saldo")).toBe(exhausted);
    fresh.close();
  }
  expect(exhausted).toBe(true);
  expect(transport.mock.calls.length).toBeGreaterThan(3);
  const account = openModelSpendingAccount(home, settings.spendingAccount, "test", settings.capNanoUsd);
  try {
    const balance = billingAccount(account.billing, "test");
    expect(balance.spentNanoUsd).toBeGreaterThan(8e9);
    expect(balance.spentNanoUsd + balance.reservedNanoUsd).toBeLessThanOrEqual(10e9);
  } finally {
    account.close();
  }
});
it("publishes every catalog card while charging the offline bank and thinking to explicit billing", async () => {
  const f = fixture();
  const settings = resources();
  const account = openModelSpendingAccount(f.home, settings.spendingAccount, "test", settings.capNanoUsd);
  const billed = { capNanoUsd: settings.capNanoUsd, billing: account.billing };
  try {
    const offline = await f.open(billed, false);
    await f.bank(offline, billed);
    const bank = billingAccount(account.billing, "test").spentNanoUsd;
    expect(bank).toBeGreaterThan(1.02e9);
    expect(offline.tools.state().house.modelCalls.size).toBe(0);
    offline.close();
    const house = await f.open(billed);
    expect(house.tools.state().house.mindCards.get("mind:notes")).toHaveLength(cards.length);
    expect(billingAccount(account.billing, "test").spentNanoUsd).toBe(bank);
    await think(f, house);
    expect(billingAccount(account.billing, "test").spentNanoUsd).toBeGreaterThan(bank);
    expect(house.tools.state().house.modelCalls.size).toBe(0);
    house.close();
  } finally {
    account.close();
  }
});
it("fails visibly before transport while another house owns the account, then opens after release", async () => {
  const settings = resources();
  const first = fixture();
  const second = fixture();
  const house = await first.open(settings);
  await expect(second.open(settings)).rejects.toThrow("cuenta de modelos");
  expect(second.transport).not.toHaveBeenCalled();
  house.close();
  const next = await second.open(settings);
  expect(second.transport).not.toHaveBeenCalled();
  await think(second, next);
  expect(second.transport).toHaveBeenCalledOnce();
  next.close();
});
it("retains an in-flight reservation after closing and blocks a new house like mente", async () => {
  const settings = resources();
  const card = cards[0];
  if (!card) throw new Error("card");
  settings.capNanoUsd = settings.spendingAccount.openingNanoUsd + maximumProgramCall(card, 50000);
  const first = fixture();
  const house = await first.open(settings);
  let release: ((response: Response) => void) | undefined;
  first.transport.mockImplementation(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  first.wake(house);
  await vi.waitFor(() => expect(release).toBeDefined());
  house.close();
  const db = new DatabaseSync(settings.spendingAccount.file);
  const reservations = db.prepare("select data from events where kind = 'model-call-reserved'").all();
  expect(reservations.length).toBe(1);
  db.close();
  const account = openModelSpendingAccount(first.home, settings.spendingAccount, "test", settings.capNanoUsd);
  try {
    expect(billingAccount(account.billing, "test").reservedNanoUsd).toBeGreaterThan(0);
  } finally {
    account.close();
  }
  const second = fixture();
  const blocked = await second.open(settings);
  await think(second, blocked);
  expect(second.transport).not.toHaveBeenCalled();
  expect(blocked.mindNotices?.().join(" ")).toContain("saldo");
  blocked.close();
  release?.(new Response("{}", { status: 503 }));
  await (await house.minds)?.flush();
});
it("keeps house-local billing when no spending account is supplied", async () => {
  const first = fixture();
  const second = fixture();
  const a = await first.open();
  await think(first, a);
  const spent = modelAccount(a.tools.state().house.modelCalls, "test").spentNanoUsd;
  expect(spent).toBeGreaterThan(0);
  a.close();
  const reopened = await first.open();
  expect(modelAccount(reopened.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(spent);
  expect(first.transport).toHaveBeenCalledOnce();
  const fresh = await second.open();
  expect(modelAccount(fresh.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(0);
  await think(second, fresh);
  expect(second.transport).toHaveBeenCalledOnce();
  expect(modelAccount(fresh.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(spent);
});
