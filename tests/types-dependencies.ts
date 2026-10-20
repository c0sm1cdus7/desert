import { capability, controllerRole, mutationJourney, readJourney, objectType, text } from "../src/index.ts";
import { Note } from "../products/notebook/note.ts";
import { CreateNoteRecord } from "../products/notebook/commands.ts";
import { NotesController } from "../products/notebook/dependencies.ts";
import { createAvailability } from "../src/client.ts";
import { localPlan } from "./fixtures/availability.ts";

const requirements = { controller: NotesController, dependencies: [] };
mutationJourney("create", CreateNoteRecord, requirements);
readJourney("read", Note, { fields: ["title"], collection: ["title"], requires: requirements });
// @ts-expect-error Dependencies must be explicit on a mutation journey.
mutationJourney("create", CreateNoteRecord);
// @ts-expect-error Dependencies must be explicit on a read journey too.
readJourney("read", Note, { fields: ["title"], collection: ["title"] });

const Other = objectType({ id: "other", facts: { name: text({ minLength: 1 }) } });
const OtherController = controllerRole({ id: "other-controller", objects: [Other], requires: [] });
const SharedController = controllerRole({ id: "shared", objects: [Note, Other], requires: [] });
const shared = { controller: SharedController, dependencies: [] };
mutationJourney("shared-create", CreateNoteRecord, shared);
readJourney("shared-note", Note, { fields: ["title"], collection: ["title"], requires: shared });
readJourney("shared-other", Other, { fields: ["name"], collection: ["name"], requires: shared });
const Foreign = objectType({ id: "foreign", facts: { name: text({ minLength: 1 }) } });
// @ts-expect-error Multiple owned objects do not authorize an unowned object.
readJourney("foreign", Foreign, { fields: ["name"], collection: ["name"], requires: shared });
// @ts-expect-error Reads must reject a controller that owns only another object.
readJourney("wrong-read", Note, { fields: ["title"], collection: ["title"], requires: { controller: OtherController, dependencies: [] } });
const uncertainController = Math.random() > 0.5 ? SharedController : OtherController;
// @ts-expect-error Every possible controller must own the required object.
mutationJourney("uncertain", CreateNoteRecord, { controller: uncertainController, dependencies: [] });
const unverifiedController: import("../src/dependencies.ts").ControllerDefinition = SharedController;
// @ts-expect-error A broad runtime descriptor is not static membership evidence.
mutationJourney("unverified", CreateNoteRecord, { controller: unverifiedController, dependencies: [] });
// @ts-expect-error A controller for another object cannot govern this command.
mutationJourney("create", CreateNoteRecord, { controller: OtherController, dependencies: [] });
// @ts-expect-error A capability does not establish a controller role.
mutationJourney("create", CreateNoteRecord, { controller: capability({ id: "network", requires: [] }), dependencies: [] });

const availability = createAvailability(localPlan());
const reporter = availability.begin("notes");
// @ts-expect-error Internet online is not a dependency observation.
reporter.unavailable("online");
// @ts-expect-error Observation freshness is a duration, not arbitrary text.
reporter.ready("digest", "forever");
// @ts-expect-error Readiness cannot grant authority.
availability.snapshot().journeys["read-note"]!.authorized;
availability.dispose();
