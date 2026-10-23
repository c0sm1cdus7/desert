import { compile } from "../../src/compile.ts";
import { openLocalController } from "../../src/local.ts";
import { Notebook } from "../../products/notebook/product.ts";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const host = await openLocalController(compile(Notebook), { ...request.database, roles: ["notes"] });
try {
  await host.connect(request.token, "human").accept(request.intentId, request.confirmationDigest);
} finally { await host.close(); }
