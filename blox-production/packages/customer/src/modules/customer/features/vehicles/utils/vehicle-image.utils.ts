import type { Product } from '@shared/models/product.model';

/**
 * Per-vehicle Higgsfield studio shots keyed by product id.
 * Generated from each vehicle's make / model / year / color / description.
 */
const VEHICLE_IMAGES_BY_ID: Record<string, string> = {
  // Over 70k (still mapped for admin / existing applications)
  'vehicle-1': '/vehicles/vehicle-1-vw-teramont-grey.webp',
  'vehicle-2': '/vehicles/vehicle-2-audi-a6-grey.webp',
  'vehicle-3': '/vehicles/vehicle-3-jetour-t2-grey.webp',
  // Under 70k catalog
  'vehicle-54': '/vehicles/vehicle-54-mg-5.webp',
  'vehicle-55': '/vehicles/vehicle-55-geely-emgrand.webp',
  'vehicle-56': '/vehicles/vehicle-56-changan-alsvin-white.webp',
  'vehicle-57': '/vehicles/vehicle-57-changan-alsvin-silver.webp',
  'vehicle-58': '/vehicles/vehicle-58-changan-alsvin-red.webp',
  'vehicle-59': '/vehicles/vehicle-59-toyota-yaris-white.webp',
  'vehicle-60': '/vehicles/vehicle-60-toyota-yaris-silver.webp',
  'vehicle-61': '/vehicles/vehicle-61-toyota-yaris-black.webp',
  'vehicle-62': '/vehicles/vehicle-62-seat-ibiza-red.webp',
  'vehicle-63': '/vehicles/vehicle-63-seat-ibiza-white.webp',
  'vehicle-64': '/vehicles/vehicle-64-seat-ibiza-grey.webp',
  'vehicle-65': '/vehicles/vehicle-65-chery-tiggo4-white.webp',
  'vehicle-66': '/vehicles/vehicle-66-chery-tiggo4-grey.webp',
  'vehicle-67': '/vehicles/vehicle-67-chery-tiggo4-blue.webp',
  'vehicle-68': '/vehicles/vehicle-68-suzuki-dzire-white.webp',
  'vehicle-69': '/vehicles/vehicle-69-suzuki-dzire-blue.webp',
  'vehicle-70': '/vehicles/vehicle-70-mg-zs-white.webp',
  'vehicle-71': '/vehicles/vehicle-71-mg-zs-red.webp',
  'vehicle-72': '/vehicles/vehicle-72-hyundai-accent-silver.webp',
  'vehicle-73': '/vehicles/vehicle-73-hyundai-accent-white.webp',
  'vehicle-74': '/vehicles/vehicle-74-chery-arrizo5-white.webp',
  'vehicle-75': '/vehicles/vehicle-75-chery-arrizo5-grey.webp',
  'vehicle-76': '/vehicles/vehicle-76-mg-5-white.webp',
  'vehicle-77': '/vehicles/vehicle-77-mg-5-blue.webp',
  'vehicle-78': '/vehicles/vehicle-78-geely-emgrand-white.webp',
  'vehicle-79': '/vehicles/vehicle-79-geely-emgrand-black.webp',
};

/** Fallback when a specific shot is not available yet. */
const DEFAULT_VEHICLE_IMAGE = '/vehicles/sedan.webp';

/**
 * Prefer a vehicle-specific Higgsfield image: stored product.images[0], then
 * legacy id map, then sedan fallback.
 */
export function getVehicleDisplayImage(
  vehicle: Pick<Product, 'id' | 'make' | 'model' | 'trim' | 'images'>
): string {
  const stored = vehicle.images?.[0]?.trim();
  if (stored) {
    if (stored.startsWith('/') || stored.startsWith('http') || stored.startsWith('asset:')) {
      return stored;
    }
  }
  if (vehicle.id && VEHICLE_IMAGES_BY_ID[vehicle.id]) {
    return VEHICLE_IMAGES_BY_ID[vehicle.id];
  }

  return DEFAULT_VEHICLE_IMAGE;
}
