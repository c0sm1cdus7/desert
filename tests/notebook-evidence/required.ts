import { Notebook } from "../../products/notebook/product.ts";
import { scenarioNames } from "../fixtures/journey-runtime.ts";

// Enumerate contract entries, not executor discoveries or reported passing tests.
const matrixFile = "tests/notebook-journeys.test.ts";
const preservationFile = "tests/notebook-preservation.test.ts";
export const notebookEvidenceFiles = [matrixFile, preservationFile];
export const requiredNotebookCases = [
  { file: matrixFile, name: "Notebook evidence covers exactly the declared journeys and every required behavior" },
  { file: matrixFile, name: "adding a compiled journey or removing its independent cases fails the coverage gate" },
  ...Notebook.surfaces.flatMap(surface => [
    ...surface.journeys.flatMap(journey =>
      scenarioNames.map(behavior =>
        ({ file: matrixFile, name: `Notebook ${surface.id}/${journey}: ${behavior}` }))),
    { file: preservationFile, name: `Notebook ${surface.id}: archive preserves note content` },
  ]),
];
export const caseKey = (item: { file: string, name: string }) => `${item.file}::${item.name}`;
