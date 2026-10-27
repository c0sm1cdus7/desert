import type { PoolClient } from "pg";
import type { LocalProgram } from "../local/program.ts";
import { requirePrivateImageHost, type PrivateImageHost } from "./host.ts";
import { imageInputScope } from "./admission.ts";
import { privateAssetRecord, reservePrivateAsset, type AssetScope } from "./records.ts";
import { claimPrivateAssetUpload, completePrivateAssetUpload, failPrivateAssetUpload } from "./staging.ts";
import { assetReference, assetMediaKind, fileValue, type AssetImageStatus, type AssetImageVariant } from "./types.ts";
import { imageByteStream } from "./stream.ts";
import { optimizePrivateAsset } from "./image.ts";
import { readAssetDetail, readPrivateImage } from "./read.ts";

export type AssetTransaction = <T>(operation: (client: PoolClient, actor: string) => Promise<T>, readOnly?: boolean) => Promise<T>;
/** The staging and reading of a journey's file inputs. The names say image for the wire protocol's sake; any accepted media
 * type travels through them. */
export function privateImageSession(transact: AssetTransaction, program: LocalProgram, surface: string, installed?: PrivateImageHost) {
  return {
    reserveImage(runId: string, inputField: string, size: number) {
      const host = requirePrivateImageHost(installed);
      return transact(async (client, actor) => {
        const scope = await imageInputScope(client, program, actor, surface, runId, inputField, host.store.id);
        return assetReference((await reservePrivateAsset(client, scope, size)).id);
      });
    },
    imageStatus(runId: string, inputField: string, reference: string): Promise<AssetImageStatus> {
      const host = requirePrivateImageHost(installed);
      return transact(async (client, actor) => {
        const scope = await imageInputScope(client, program, actor, surface, runId, inputField, host.store.id, true);
        const record = await privateAssetRecord(client, scope, reference);
        if (record.state !== "ready" && record.state !== "attached") return { state: record.state };
        if (!record.metadata) throw new Error("CORRUPT_OBJECT");
        return { state: record.state, asset: fileValue(record.id, scope.accept, assetMediaKind(record.metadata)) };
      });
    },
    uploadImage(runId: string, inputField: string, reference: string,
      chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options?: { signal?: AbortSignal }) {
      const host = requirePrivateImageHost(installed);
      return host.upload(async signal => {
        let scope: AssetScope | undefined;
        try {
          const claimed = await transact(async (client, actor) => {
            const admitted = await imageInputScope(client, program, actor, surface, runId, inputField, host.store.id);
            return { scope: admitted, record: await claimPrivateAssetUpload(client, admitted, reference) };
          });
          scope = claimed.scope;
          await host.store.allocate(reference);
          const original = await host.store.writeOriginal(reference, imageByteStream(chunks, signal), claimed.record.declared_size);
          const image = await optimizePrivateAsset(host.store, reference, original, claimed.scope.accept, signal);
          host.assertOpen();
          await transact((client, actor) => {
            if (actor !== claimed.scope.actor) throw new Error("UNAUTHENTICATED");
            if (signal.aborted) throw new Error("ASSET_TRANSFER_CANCELLED");
            return completePrivateAssetUpload(client, program, claimed.scope, reference, image);
          });
          return fileValue(reference, claimed.scope.accept, assetMediaKind(image));
        } catch (error) {
          if (scope) await transact((client, actor) => {
            if (actor !== scope!.actor) throw new Error("UNAUTHENTICATED");
            return failPrivateAssetUpload(client, scope!, reference);
          }).catch(() => {});
          throw error;
        }
      }, options?.signal);
    },
    image(runId: string, reference: string, variant: AssetImageVariant, options?: { signal?: AbortSignal }) {
      return readPrivateImage(transact, program, surface, requirePrivateImageHost(installed), runId, reference, variant, options?.signal);
    },
    /** The default detail of a file the read journey `runId` shows: its asset object's facts (src/assets/object.ts). */
    asset(runId: string, reference: string) {
      requirePrivateImageHost(installed);
      return transact((client, actor) => readAssetDetail(client, program, actor, surface, runId, reference));
    },
  };
}
