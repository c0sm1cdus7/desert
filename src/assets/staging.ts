import type { PoolClient } from "pg";
import { requireOptimizedImage } from "./image.ts";
import { privateAssetRecord, requireAssetRun, type AssetScope } from "./records.ts";
import {assetMediaKind,type PrivateAssetMetadata} from "./types.ts";

export async function claimPrivateAssetUpload(client: PoolClient, scope: AssetScope, reference: string) {
  await requireAssetRun(client, scope);
  const record = await privateAssetRecord(client, scope, reference);
  if (record.state !== "reserved") throw new Error(record.state === "uploading" ? "ASSET_UPLOAD_IN_PROGRESS" : "ASSET_UPLOAD_NOT_ADMITTED");
  await client.query("UPDATE desert_assets SET state = 'uploading' WHERE id = $1", [record.id]);
  return record;
}
export async function completePrivateAssetUpload(client: PoolClient, scope: AssetScope, reference: string, image: PrivateAssetMetadata) {
  requireOptimizedImage(image, scope.storeId, reference);
  if(scope.media!=="media"&&assetMediaKind(image)!=="image") throw new Error("UNSUPPORTED_IMAGE_ASSET");
  await requireAssetRun(client, scope);
  const record = await privateAssetRecord(client, scope, reference);
  if (record.state !== "uploading") throw new Error("ASSET_UPLOAD_NOT_ADMITTED");
  if (image.original.size !== record.declared_size) throw new Error("ASSET_SIZE_MISMATCH");
  const bytes = image.original.size + image.renditions.reduce((total, rendition) => total + rendition.size, 0);
  if (bytes > Number(record.reserved_bytes)) throw new Error("ASSET_QUOTA_EXCEEDED");
  await client.query("UPDATE desert_assets SET state = 'ready', metadata = $2, reserved_bytes = $3 WHERE id = $1", [reference, image, bytes]);
}
export async function failPrivateAssetUpload(client: PoolClient, scope: AssetScope, reference: string) {
  const record = await privateAssetRecord(client, scope, reference);
  if (record.state === "uploading") await client.query("UPDATE desert_assets SET state = 'failed' WHERE id = $1", [reference]);
}
