import type { Product } from '../models/product.model';

const DEFAULT_VEHICLE_IMAGE = '/vehicles/sedan.webp';

function trimFallback(trim?: string): string {
  const t = (trim || '').toLowerCase();
  if (t.includes('suv') || t.includes('crossover') || t.includes('q')) {
    return '/vehicles/suv.webp';
  }
  if (t.includes('hatch') || t.includes('sportback')) {
    return '/vehicles/hatchback.webp';
  }
  return DEFAULT_VEHICLE_IMAGE;
}

/**
 * Sync display URL for product cards.
 * Prefer stored public/http image, then `/vehicles/{id}.webp`, then body-type placeholder.
 * Storage paths (e.g. `vehicle-images/...`) are returned as-is for signed-URL resolution.
 */
export function getProductDisplayImage(
  product: Pick<Product, 'id' | 'images' | 'trim'>
): string {
  const stored = product.images?.[0]?.trim();
  if (stored) {
    if (
      stored.startsWith('/') ||
      stored.startsWith('http://') ||
      stored.startsWith('https://') ||
      stored.startsWith('data:')
    ) {
      return stored;
    }
    // Private storage path — caller should resolve via resolveDocumentsSignedUrl
    return stored;
  }

  if (product.id) {
    return `/vehicles/${product.id}.webp`;
  }

  return trimFallback(product.trim);
}

export function isPublicOrRemoteImageUrl(url: string): boolean {
  return (
    url.startsWith('/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  );
}

export { DEFAULT_VEHICLE_IMAGE };
