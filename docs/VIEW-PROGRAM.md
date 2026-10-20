# Executable View program — finite first slice

`compileViewProgram(definition, compiledSurface)` binds closed presentation data
to an existing compiled human surface. It returns a deeply frozen `ViewProgram`;
it does not grant execution authority or install another controller.

The program declares product identity, Views, journey bindings, destinations,
an entry destination and explicit navigation order. Data schemas remain with the
canonical journeys and commands. Collection, form and context nodes name input
ports; their kinds determine the canonical data supplied at runtime. Toolbar
actions and collection selection name output ports, whose behavior is bound by
the program rather than by a View or renderer callback.

## Installed limits

- Exactly one canonical read journey and one canonical create journey bind to
  the existing surface entry and primary action. Presentation journeys need no
  controller and each read/presentation journey has one navigation destination.
- Read content includes one collection. Its detail View is exactly a Header
  followed by context. The editor View is exactly a Header followed by form,
  with `preferredDock: "right"`.
- The editor submit action is its sole bottom primary action and uses the
  canonical form submit intent, including keyboard submission. Review and
  uncertain-result recovery remain canonical runtime states.
- A panel's close action is first in its top toolbar. Context panels have no
  additional toolbar actions; the editor may have other top actions. Main Views
  may have one bottom primary action. Unsupported placements fail compilation.
- A Header, when declared, is the first content item and supplies the docked
  toolbar identity. One output may appear only once across both toolbars, so
  repeated controls cannot assign contradictory availability to the same port.
- Side-dock authoring and Header media remain valid literal `View` vocabulary
  but are rejected by this executable slice. A visual catalog is allowed only
  once in a presentation View. Update journeys are not installed by this slice.

## One dismissal rule

Dismissal is available unless the runtime is busy or the operation's outcome is
uncertain. That same owner controls the close button, Escape, scrim and adaptive
panel dismissal. Authored `disabled: true` on an action bound to `close` is rejected
with `AUTHORED_CLOSE_DISABLED`; omitted or false cannot override runtime locking.
An authored View therefore cannot create a competing dismissal policy.

Other authored disabled actions are honored both visually and when their output
is dispatched directly. Hidden/unknown outputs, unknown references, unbound
ports, incompatible slot kinds, extra properties and unreachable declarations
are rejected. Structural validity remains separate from authority to execute.

Sources: `src/views/program-schema.ts`, `src/views/program.ts`,
`src/views/program-outputs.ts`, `src/web/client/view-program.ts` and
`src/web/client/view-projection.ts`. Independent contract and normalized runtime
witnesses are in `tests/view-program*.test.ts`; these are not native-platform,
real-provider, real-database or complete visual-qualification evidence.
