import assert from "node:assert/strict";
import test from "node:test";
import { clientDistribution, composeProduct, controllerDistribution, defineModule, localBinding, moduleCatalog,
  remoteBinding } from "../src/index.ts";
import { Notebook } from "../products/notebook/product.ts";
import { NotesController } from "../products/notebook/dependencies.ts";
import { Dependencies } from "../products/notebook/src/modules.ts";
import { catalogFixture, notesSource } from "./fixtures/module-catalog.ts";

function composedFixture() {
  const f = catalogFixture();
  const product = composeProduct(f.source).definition;
  const surface = product.surfaces?.find(surface => surface.kind === "human");
  if (surface?.kind !== "human") throw new Error("Expected human surface");
  return { ...f, product, surface };
}

for (const kind of ["local", "remote"] as const) {
  test(`A ${kind} client binding cannot erase an unmounted homonymous dependency's identity`, () => {
    const { product, surface } = composedFixture();
    const foreign = moduleCatalog([defineModule(notesSource())]).dependencies.NotesController;
    assert.throws(() => clientDistribution({ id: "client", product, surface, renderer: "svelte-web",
      bindings: [kind === "local" ? localBinding(foreign, "other-adapter")
        : remoteBinding(foreign, { id: "other-controller", kind: "controller" })],
    }), /UNMOUNTED_MODULE_REFERENCE/);
  });

  test(`An exact mounted ${kind} client binding lowers to the unchanged canonical wire shape`, () => {
    const { product, surface, modules } = composedFixture();
    const binding = kind === "local" ? localBinding(modules.dependencies.NotesController, "notes-adapter")
      : remoteBinding(modules.dependencies.NotesController, { id: "notes-server", kind: "controller" });
    const distribution = clientDistribution({ id: "client", product, surface, renderer: "svelte-web", bindings: [binding] });
    assert.deepEqual(distribution, { id: "client", product: product.id, surface: surface.id, renderer: "svelte-web",
      kind: "client", bindings: [{ dependency: NotesController.id, kind,
        ...(kind === "local" ? { adapter: "notes-adapter" } : { service: "notes-server" }) }] });
  });

  for (const forgery of ["raw-owned", "raw-clone", "token-clone"] as const) {
    test(`A ${kind} client binding rejects a ${forgery} module dependency`, () => {
      const { product, surface, modules, owned } = composedFixture();
      const target = forgery === "raw-owned" ? owned.dependencies[0]
        : forgery === "raw-clone" ? { ...owned.dependencies[0] } : { ...modules.dependencies.NotesController };
      const error = forgery === "raw-owned" ? "PRIVATE_MODULE_REFERENCE"
        : forgery === "raw-clone" ? "UNREGISTERED_LOCAL_REFERENCE" : "UNREGISTERED_MODULE_REFERENCE";
      assert.throws(() => clientDistribution({ id: "client", product, surface, renderer: "svelte-web",
        bindings: [kind === "local" ? localBinding(target, "notes-adapter")
          : remoteBinding(target, { id: "notes-server", kind: "controller" })],
      }), { message: error });
    });
  }

  test(`An exact product-owned ${kind} dependency remains valid without accepting a matching clone`, () => {
    const f = catalogFixture();
    const dependency = { id: "root-capability", kind: "capability" as const, requires: [] };
    const product = composeProduct({ ...f.source, dependencies: [dependency] }).definition;
    const surface = product.surfaces?.find(surface => surface.kind === "human");
    if (surface?.kind !== "human") throw new Error("Expected human surface");
    const binding = kind === "local" ? localBinding(dependency, "root-adapter")
      : remoteBinding(dependency, { id: "root-server", kind: "controller" });
    const distribution = clientDistribution({ id: "root-client", product, surface, renderer: "svelte-web", bindings: [binding] });
    assert.deepEqual(distribution.bindings, [{ dependency: dependency.id, kind,
      ...(kind === "local" ? { adapter: "root-adapter" } : { service: "root-server" }) }]);
    assert.throws(() => clientDistribution({ id: "root-client", product, surface, renderer: "svelte-web",
      bindings: [kind === "local" ? localBinding({ ...dependency }, "root-adapter")
        : remoteBinding({ ...dependency }, { id: "root-server", kind: "controller" })],
    }), { message: "UNREGISTERED_LOCAL_REFERENCE" });
  });

  test(`A ${kind} binding cannot redirect an admitted root dependency by mutating its identifier`, () => {
    const f = catalogFixture();
    const dependency = { id: "root-capability", kind: "capability" as const, requires: [] };
    const product = composeProduct({ ...f.source, dependencies: [dependency] }).definition;
    const surface = product.surfaces?.find(surface => surface.kind === "human");
    if (surface?.kind !== "human") throw new Error("Expected human surface");
    dependency.id = f.modules.dependencies.NotesController.id;
    assert.throws(() => clientDistribution({ id: "redirected-client", product, surface, renderer: "svelte-web",
      bindings: [kind === "local" ? localBinding(dependency, "root-adapter")
        : remoteBinding(dependency, { id: "root-server", kind: "controller" })],
    }), { message: "MUTATED_DEPENDENCY_REFERENCE" });
  });

  test(`The composed Notebook ${kind} binding requires its published dependency reference`, () => {
    const surface = Notebook.surfaces.find(surface => surface.kind === "human");
    if (surface?.kind !== "human") throw new Error("Expected composed Notebook human surface");
    const binding = kind === "local" ? localBinding(Dependencies.notes, "notes-adapter")
      : remoteBinding(Dependencies.notes, { id: "notes-server", kind: "controller" });
    const distribution = clientDistribution({ id: "notebook-client", product: Notebook, surface, renderer: "svelte-web", bindings: [binding] });
    assert.deepEqual(distribution.bindings, [{ dependency: Dependencies.notes.id, kind,
      ...(kind === "local" ? { adapter: "notes-adapter" } : { service: "notes-server" }) }]);
    assert.throws(() => kind === "local" ? localBinding(NotesController, "notes-adapter")
      : remoteBinding(NotesController, { id: "notes-server", kind: "controller" }), { message: "PRIVATE_MODULE_REFERENCE" });
  });
}

test("Controller distribution and client bindings enforce the same exact mounted dependency owner", () => {
  const { product, surface, modules } = composedFixture();
  const foreign = moduleCatalog([defineModule(notesSource())]).dependencies.NotesController;
  assert.throws(() => controllerDistribution({ id: "server", product, serves: [surface], runtime: "node",
    storage: "postgresql", provides: [foreign] }), /UNMOUNTED_MODULE_REFERENCE/);
  const controller = controllerDistribution({ id: "server", product, serves: [surface], runtime: "node",
    storage: "postgresql", provides: [modules.dependencies.NotesController] });
  assert.deepEqual(controller.provides, [NotesController.id]);
});
