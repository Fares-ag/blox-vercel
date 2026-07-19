/**
 * Private `documents` bucket helpers.
 * Prefer storing `path` on document metadata; sign on read (getPublicUrl 403s).
 */

export const DOCUMENTS_BUCKET = 'documents';

const OBJECT_MARKERS = [
  `/storage/v1/object/public/${DOCUMENTS_BUCKET}/`,
  `/storage/v1/object/sign/${DOCUMENTS_BUCKET}/`,
  `/storage/v1/object/authenticated/${DOCUMENTS_BUCKET}/`,
] as const;

export type DocumentsStorageRef = {
  path?: string | null;
  url?: string | null;
};

/** Extract object path from a relative path or Supabase public/signed URL. */
export function extractDocumentsStoragePath(
  urlOrPath: string | null | undefined
): string | null {
  if (!urlOrPath) return null;
  const raw = urlOrPath.trim();
  if (!raw) return null;

  // Relative storage path (optionally prefixed with bucket name).
  if (!raw.includes('://') && !raw.startsWith('/storage/')) {
    const withoutQuery = raw.split('?')[0] ?? raw;
    if (withoutQuery.startsWith(`${DOCUMENTS_BUCKET}/`)) {
      return withoutQuery.slice(DOCUMENTS_BUCKET.length + 1);
    }
    return withoutQuery;
  }

  for (const marker of OBJECT_MARKERS) {
    const idx = raw.indexOf(marker);
    if (idx >= 0) {
      const rest = raw.slice(idx + marker.length).split('?')[0] ?? '';
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }

  return null;
}

type SignedUrlClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

function isPrivatePublicUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${DOCUMENTS_BUCKET}/`);
}

/**
 * Resolve a short-lived signed URL for a documents-bucket object.
 * When a storage path is known, does not fall back to private public URLs (403).
 */
export async function resolveDocumentsSignedUrl(
  supabase: SignedUrlClient,
  ref: DocumentsStorageRef | string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const path =
    typeof ref === 'string'
      ? extractDocumentsStoragePath(ref)
      : extractDocumentsStoragePath(ref.path) ??
        extractDocumentsStoragePath(ref.url);

  const fallback =
    typeof ref === 'string' ? ref : ref.url ?? ref.path ?? null;

  if (path) {
    try {
      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) {
        console.error('createSignedUrl failed for documents path', path, error);
        // Never return a known-broken private public URL
        if (fallback && !isPrivatePublicUrl(fallback) && fallback.includes('://')) {
          return fallback;
        }
        return null;
      }
      return data.signedUrl;
    } catch (error) {
      console.error('createSignedUrl threw for documents path', path, error);
      if (fallback && !isPrivatePublicUrl(fallback) && fallback.includes('://')) {
        return fallback;
      }
      return null;
    }
  }

  if (fallback && isPrivatePublicUrl(fallback)) {
    return null;
  }
  return fallback;
}

/** Open a documents object in a new tab using a signed URL when possible. */
export async function openDocumentsStorageRef(
  supabase: SignedUrlClient,
  ref: DocumentsStorageRef | string,
  expiresInSeconds = 3600
): Promise<void> {
  const url = await resolveDocumentsSignedUrl(supabase, ref, expiresInSeconds);
  if (!url) {
    throw new Error('Unable to open document — signed URL unavailable');
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
