import type { Product } from '@shared/models/product.model';

/**
 * Per-vehicle Higgsfield studio shots keyed by product id.
 * Generated from each vehicle's make / model / year / color / description.
 */
const VEHICLE_IMAGES_BY_ID: Record<string, string> = {
  // Over 70k (still mapped for admin / existing applications)
  'vehicle-1': '/vehicles/vehicle-1-vw-teramont-grey.png',
  'vehicle-2': '/vehicles/vehicle-2-audi-a6-grey.png',
  'vehicle-3': '/vehicles/vehicle-3-jetour-t2-grey.png',
  // Under 70k catalog
  'vehicle-54': '/vehicles/vehicle-54-mg-5.png',
  'vehicle-55': '/vehicles/vehicle-55-geely-emgrand.png',
  'vehicle-56': '/vehicles/vehicle-56-changan-alsvin-white.png',
  'vehicle-57': '/vehicles/vehicle-57-changan-alsvin-silver.png',
  'vehicle-58': '/vehicles/vehicle-58-changan-alsvin-red.png',
  'vehicle-59': '/vehicles/vehicle-59-toyota-yaris-white.png',
  'vehicle-60': '/vehicles/vehicle-60-toyota-yaris-silver.png',
  'vehicle-61': '/vehicles/vehicle-61-toyota-yaris-black.png',
  'vehicle-62': '/vehicles/vehicle-62-seat-ibiza-red.png',
  'vehicle-63': '/vehicles/vehicle-63-seat-ibiza-white.png',
  'vehicle-64': '/vehicles/vehicle-64-seat-ibiza-grey.png',
  'vehicle-65': '/vehicles/vehicle-65-chery-tiggo4-white.png',
  'vehicle-66': '/vehicles/vehicle-66-chery-tiggo4-grey.png',
  'vehicle-67': '/vehicles/vehicle-67-chery-tiggo4-blue.png',
  'vehicle-68': '/vehicles/vehicle-68-suzuki-dzire-white.png',
  'vehicle-69': '/vehicles/vehicle-69-suzuki-dzire-blue.png',
  'vehicle-70': '/vehicles/vehicle-70-mg-zs-white.png',
  'vehicle-71': '/vehicles/vehicle-71-mg-zs-red.png',
  'vehicle-72': '/vehicles/vehicle-72-hyundai-accent-silver.png',
  'vehicle-73': '/vehicles/vehicle-73-hyundai-accent-white.png',
  'vehicle-74': '/vehicles/vehicle-74-chery-arrizo5-white.png',
  'vehicle-75': '/vehicles/vehicle-75-chery-arrizo5-grey.png',
  'vehicle-76': '/vehicles/vehicle-76-mg-5-white.png',
  'vehicle-77': '/vehicles/vehicle-77-mg-5-blue.png',
  'vehicle-78': '/vehicles/vehicle-78-geely-emgrand-white.png',
  'vehicle-79': '/vehicles/vehicle-79-geely-emgrand-black.png',
};

/** Fallback when a specific shot is not available yet. */
const DEFAULT_VEHICLE_IMAGE = '/vehicles/sedan.png';

/**
 * Prefer a vehicle-specific Higgsfield image over stored product images.
 */
export function getVehicleDisplayImage(
  vehicle: Pick<Product, 'id' | 'make' | 'model' | 'trim' | 'images'>
): string {
  if (vehicle.id && VEHICLE_IMAGES_BY_ID[vehicle.id]) {
    return VEHICLE_IMAGES_BY_ID[vehicle.id];
  }

  return DEFAULT_VEHICLE_IMAGE;
}
