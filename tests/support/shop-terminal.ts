// The socket terminal; the local shop-open remains a public test fixture.
import { openProgramTerminal } from "../../src/doors/terminal/open-terminal.ts";
import { program, shown } from "./shop-program.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing house path");
await openProgramTerminal(process.cwd(), home, `${process.argv[3] ?? "ana"}-terminal`, program, shown);
