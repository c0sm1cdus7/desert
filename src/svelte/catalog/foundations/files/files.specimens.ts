// One witness of Files per state: nothing chosen yet, two files chosen, and a control that cannot change now.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FilesSpecimens = [
  { state: "empty", props: { node: { version: "desert.control/1", kind: "files", id: "files-specimen-empty", label: "Attachments",
    disabled: false, files: [], limits: { maxCount: 3, maxFileBytes: 5242880, maxTotalBytes: 10485760, accept: ["image/png", "application/pdf"] } } } },
  { state: "chosen", props: { node: { version: "desert.control/1", kind: "files", id: "files-specimen-chosen", label: "Attachments",
    disabled: false, files: [
      { id: "files-specimen-receipt", name: "receipt.pdf", size: 182000, mediaType: "application/pdf", lastModified: 1760000000000 },
      { id: "files-specimen-photo", name: "harbour.png", size: 2400000, mediaType: "image/png", lastModified: 1760000000000 },
    ], limits: { maxCount: 3, maxFileBytes: 5242880, maxTotalBytes: 10485760, accept: ["image/png", "application/pdf"] } } } },
  { state: "disabled", props: { node: { version: "desert.control/1", kind: "files", id: "files-specimen-disabled", label: "Attachments",
    disabled: true, files: [], limits: { maxCount: 1, maxFileBytes: 5242880, maxTotalBytes: 5242880, accept: ["image/png"] } } } },
] as const satisfies readonly CatalogSpecimen<"files">[];
