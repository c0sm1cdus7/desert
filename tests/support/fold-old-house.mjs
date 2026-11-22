// Fold a journal with the house code of an earlier commit and write the house it folds to, v8-serialized.
import { writeFileSync } from "node:fs";
import { serialize } from "node:v8";
import { DatabaseSync } from "node:sqlite";
const [root, file, out] = process.argv.slice(2);
const { readFact } = await import(`${root}/src/storage/journal-record.ts`);
const { emptyHouse, houseStep } = await import(`${root}/src/house/members.ts`);
const { shop } = await import(`${root}/tests/support/shop.ts`);
const db = new DatabaseSync(file, { readOnly: true });
let house = emptyHouse;
try {
  for (const row of db.prepare("select * from events order by seq").all()) house = houseStep(house, readFact(shop, row));
} finally {
  db.close();
}
writeFileSync(out, serialize(house));
