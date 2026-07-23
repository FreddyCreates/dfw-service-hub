// Reusable image upload hook following the ProviderRegister.tsx pattern.
//
// Flow: file input → read as ArrayBuffer → ExternalBlob.fromBytes(bytes,
// mimeType, filename) → URL.createObjectURL for preview.
//
// The returned ExternalBlob is what the backend adapter uploads to object
// storage on submit. The previewUrl is a transient object URL used only for
// the <img> preview and should be revoked when no longer needed.
//
// Used by page tasks for profile avatar upload, work photo upload, and
// fixing the listing photo upload (which currently uses URL.createObjectURL
// only and does not persist).

import { ExternalBlob } from "@caffeineai/object-storage";
import { useCallback } from "react";

export interface UploadedImage {
  /** Persistent blob the backend adapter uploads to object storage. */
  blob: ExternalBlob;
  /** Transient object URL for the <img> preview only. */
  previewUrl: string;
  /** Original file name, useful for labels or accessibility. */
  filename: string;
}

/**
 * Convert a single File into a persistent ExternalBlob plus a transient
 * preview URL. Returns null if the file is empty or not an image.
 *
 * This is the synchronous variant — it reads no bytes. Use
 * `readFileAsUploadedImage` for the canonical async path that reads the
 * file's ArrayBuffer before constructing the blob.
 */
export function fileToUploadedImage(file: File): UploadedImage | null {
  if (!file || !file.type.startsWith("image/")) return null;
  return {
    blob: ExternalBlob.fromBytes(new Uint8Array(0), file.type, file.name),
    previewUrl: URL.createObjectURL(file),
    filename: file.name,
  };
}

/**
 * Read a File as an ArrayBuffer and produce a persistent ExternalBlob plus
 * a transient preview URL. This is the canonical upload helper used by
 * avatar, work-photo, and listing-photo inputs.
 */
export async function readFileAsUploadedImage(
  file: File,
): Promise<UploadedImage | null> {
  if (!file || !file.type.startsWith("image/")) return null;
  const buf = await file.arrayBuffer();
  const blob = ExternalBlob.fromBytes(
    new Uint8Array(buf),
    file.type,
    file.name,
  );
  return {
    blob,
    previewUrl: URL.createObjectURL(file),
    filename: file.name,
  };
}

/**
 * Hook returning a stable `upload` callback that converts a FileList (from
 * an <input type="file"> change event) into UploadedImage entries. Use the
 * single-file helper `readFileAsUploadedImage` for one-file inputs.
 */
export function useImageUpload() {
  return useCallback(async (files: FileList | null | undefined) => {
    if (!files || files.length === 0) return [];
    const results = await Promise.all(
      Array.from(files).map(readFileAsUploadedImage),
    );
    return results.filter((r): r is UploadedImage => r !== null);
  }, []);
}

/**
 * Revoke a preview URL created by readFileAsUploadedImage when the preview
 * is no longer needed (e.g. on unmount or when replaced).
 */
export function revokePreviewUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}
