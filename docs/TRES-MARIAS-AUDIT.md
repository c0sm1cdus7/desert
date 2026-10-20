# Tres Marías port audit — 2026-10-15

## Scope and verdict

Selective reuse is appropriate; wholesale adoption of the previous engine is not.
Inspected source: Void's vendored design-system package, version 0.6.0-rc.6,
including its component manifest, presentation wrapper, Button/Field wrappers,
selected shadcn source, tokens, local patch and port documentation.
Earlier port test counts are historical claims, not DESERT verification.

Reused nine low-level component directories: button, field, input-group, input,
textarea, label, separator, badge and card; plus shared utils, tokens and fonts.
Some supporting exports are unused/tree-shaken. The presence of their source does
not make them public DESERT primitives. Provenance, original hashes, import alias
normalization and licenses are retained in src/svelte/vendor.
The previous product engine, controller, behavior rules and provider logic were
not copied. Neither Void nor Kenon's working tree was modified.

The typed control bench additionally adapts the select trigger/content/item and
popover content visual wrappers from the same design-system source. These are
Apache-2.0 adaptations, confirmed against that package's LICENSE, not MIT copies.
DESERT uses its existing semantic popover background token, 44px control targets,
local import paths and a finite renderer-neutral content contract. These visual
mechanisms do not install select/file product authoring, upload or persistence.

## Findings and dispositions

| Finding | Consequence | Disposition |
| --- | --- | --- |
| Broad class/style/variant and HTML-property APIs in visual wrappers | Each product could invent a second design system | Keep them private to the renderer; expose closed typed needs in the product grammar |
| Previous documentation contains behavior such as universal review and disabled-footer explanations | It can contradict later owner decisions | Do not import those rules; preserve explicit commit modes, context Actions and required field labels |
| Component availability is broader than executable DESERT semantics | A kitchen sink can falsely advertise capabilities | Enumerate only the installed typed bank; mark remaining categories unsupported |
| Ported textarea and its InputGroup both paint focus | Double focus outline | One group-level focus ring, with the inner control's outline suppressed |
| Some default port buttons are 40px | Below the selected 44px interaction target | The bank selects the port's lg size, not arbitrary per-product dimensions |
| Ported file input bound both files and value | Native file selection attempted to assign a nonempty filename and raised InvalidStateError | Remove bind:value only in the file branch; retain native bind:files and verify selection/rejection/removal in the browser |
| Portal insertion order alone did not order nested feedback reliably | Drawer scrim intercepted recovery-dialog clicks | Explicit drawer/dialog layer ordering; exercise lost-response recovery and nested keyboard focus |
| Catalog repeated identical landmark names | Ambiguous accessibility navigation | Reuse context composition inside isolated drawers; verify with axe |
| Short drag also emitted a click | A snap-back gesture could dismiss the drawer | Suppress the click following a drag; test actual pointer movement |
| bits-ui@2.19.2 has a local Collapsible patch in Void | Blindly omitting patches can resurrect lifecycle defects | Patch inspected: disconnected-node guard in Collapsible afterTick. Details now uses Collapsible; repeated open, keyboard toggle and teardown paths are tested. The upstream patch has not been copied; this finite evidence does not prove all interrupted lifecycle cases. |

## Security and ownership

The copied port is licensed Apache-2.0; font OFL files travel with the fonts.
Hash records describe the copied source, not signed supply-chain attestation.
Installed dependencies are pinned in the lockfile. Vendor modules can exceed the
local handwritten module-size convention; their source remains readable and attributed.

Dynamic gesture transforms and Bits UI attributes require style attributes.
CSP permits style-src-attr unsafe-inline, while scripts still forbid unsafe-eval
and unrestricted inline scripts; stylesheets and connections remain same-origin.
No raw HTML or product-authored styles enter the contract. This is a documented
tradeoff, not a claim that CSS permissions are harmless or full security certification.

## Evidence boundary

See EVIDENCE-014.md for independently executed checks and remaining limits.
The audit uses shadcn-svelte composition guidance, Apple accessibility/layout
principles and motion-design guidance. It does not claim native Apple compliance
from the use of those references. Manual assistive-technology and physical-device
testing, native haptics, arbitrary compositions and all legacy controls remain open.
