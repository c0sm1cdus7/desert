import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { home, open, sale, watch } from "../../tests/support/storage-rig.ts";

const code = `
  import { parentPort, workerData } from 'node:worker_threads';
  import { SqliteJournal } from '${new URL("../storage/journal-store.ts", import.meta.url).href}';
  import { shop } from '${new URL("../../tests/support/shop.ts", import.meta.url).href}';
  if (workerData.barrier) {
    parentPort.postMessage('ready');
    await new Promise(resolve => parentPort.once('message', resolve));
  }
  let journal;
  try {
    journal = new SqliteJournal(workerData.file, shop);
    parentPort.postMessage('opened');
  } catch (error) {
    parentPort.postMessage(error.message);
  }
  parentPort.on('message', () => { journal?.close(); parentPort.close(); });
`;
const worker = (file: string, barrier = false) =>
  new Worker(new URL(`data:text/javascript,${encodeURIComponent(code)}`), {
    workerData: { file, barrier },
  });

it("simultaneous acquisition of an abandoned same-PID lock has exactly one winner", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  open(file).close();
  writeFileSync(join(root, "journal.lock"), String(process.pid));
  const contenders = [worker(file, true), worker(file, true)];
  try {
    expect(await Promise.all(contenders.map(w => once(w, "message")))).toEqual([["ready"], ["ready"]]);
    const replies = Promise.all(contenders.map(w => once(w, "message")));
    contenders.forEach(w => w.postMessage("open"));
    const results = (await replies).flat();
    expect(results.sort()).toEqual(["This house is already open in a running process", "opened"].sort());
  } finally {
    await Promise.all(contenders.map(w => w.terminate()));
  }
  expect(() => open(file)).not.toThrow();
});

it("two workers in one process cannot own the same file while both remain alive", async () => {
  const file = join(home(), "journal.sqlite");
  const first = worker(file);
  let second: Worker | undefined;
  try {
    expect(await once(first, "message")).toEqual(["opened"]);
    second = worker(file);
    expect(await once(second, "message")).toEqual(["This house is already open in a running process"]);
  } finally {
    if (second) await second.terminate();
    await first.terminate();
  }
});

it("a terminated owner releases ownership and the next writer can restart", async () => {
  const file = join(home(), "journal.sqlite");
  const seed = open(file);
  watch(seed);
  seed.append(sale("left"), 0);
  seed.close();
  const owner = worker(file);
  try {
    expect(await once(owner, "message")).toEqual(["opened"]);
  } finally {
    await owner.terminate();
  }
  const next = open(file);
  const names = watch(next);
  next.append(sale("right"), 1);
  expect(names()).toEqual(["left", "right"]);
});
