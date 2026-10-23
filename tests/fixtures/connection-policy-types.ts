import { humanExposure } from "../../src/exposures.ts";
import { composeProduct } from "../../src/modules/compose.ts";
import { navigationOwnershipFixture } from "./navigation-ownership.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../../products/notebook/journeys.ts";

const exposure = {
  id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en",
};
humanExposure(exposure);

const connection = {
  availability: "journey-dependencies" as const, draftRetention: "session-memory" as const,
  reconnect: "refresh-without-replay" as const,
};
// @ts-expect-error Connection semantics belong to the SDK, even if an author repeats the same values.
humanExposure({ ...exposure, connection });
const overriddenExposure = { ...exposure, connection };
// @ts-expect-error A variable cannot bypass the ownership boundary.
humanExposure(overriddenExposure);
const withUndefinedPolicy = { ...exposure, connection: undefined };
// @ts-expect-error Explicit undefined still attempts to own connection policy.
humanExposure(withUndefinedPolicy);
const { composition } = navigationOwnershipFixture();
const overriddenProduct = { ...composition, exposures: [{ ...humanExposure(exposure), connection }] };
// @ts-expect-error Composition cannot bypass the same canonical policy owner.
composeProduct(overriddenProduct);
