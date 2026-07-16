import type { Product } from '@shared/models/product.model';

/**
 * Local customer catalog seed for vehicles under 70,000 QAR.
 * Merged with Supabase products (local rows win on matching id).
 * Used because anon RLS currently blocks product inserts.
 */
const now = '2026-07-16T10:00:00.000Z';

function attrs(
  pairs: Array<[string, string]>,
  prefix: string
): Product['attributes'] {
  return pairs.map(([name, value], i) => ({
    id: `${prefix}-attr-${i}`,
    name,
    value,
  }));
}

function vehicle(
  partial: Omit<Product, 'createdAt' | 'updatedAt' | 'images' | 'documents' | 'condition' | 'status' | 'mileage'> & {
    images?: string[];
  }
): Product {
  return {
    ...partial,
    condition: 'new',
    status: 'active',
    mileage: 0,
    images: partial.images || [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const CATALOG_SEED_VEHICLES: Product[] = [
  vehicle({
    id: 'vehicle-56',
    make: 'Changan',
    model: 'Alsvin',
    trim: 'Basic',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'White',
    price: 39000,
    description:
      'Compact sedan with 1.5L engine and dual-clutch automatic — entry-level value for daily commuting in Qatar.',
    attributes: attrs(
      [
        ['Transmission', 'DCT'],
        ['Seating', '5 Seater'],
        ['Horsepower', '107'],
      ],
      'v56'
    ),
  }),
  vehicle({
    id: 'vehicle-57',
    make: 'Changan',
    model: 'Alsvin',
    trim: 'Full Option',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Silver',
    price: 40900,
    description:
      'Feature-packed compact sedan with alloy wheels, reverse camera, and automatic climate control.',
    attributes: attrs(
      [
        ['Transmission', 'DCT'],
        ['Seating', '5 Seater'],
        ['Horsepower', '107'],
      ],
      'v57'
    ),
  }),
  vehicle({
    id: 'vehicle-58',
    make: 'Changan',
    model: 'Alsvin',
    trim: 'Full Option',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Red',
    price: 41500,
    description:
      'Sporty red compact sedan with modern LED lighting and dual-clutch transmission.',
    attributes: attrs(
      [
        ['Transmission', 'DCT'],
        ['Seating', '5 Seater'],
        ['Horsepower', '107'],
      ],
      'v58'
    ),
  }),
  vehicle({
    id: 'vehicle-59',
    make: 'Toyota',
    model: 'Yaris',
    trim: 'Sedan',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'White',
    price: 57000,
    description:
      'Trusted Toyota Yaris sedan — efficient, reliable, and built for Qatar roads.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Fuel Efficiency', '20+ km/L'],
      ],
      'v59'
    ),
  }),
  vehicle({
    id: 'vehicle-60',
    make: 'Toyota',
    model: 'Yaris',
    trim: 'Sedan',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Silver',
    price: 58500,
    description:
      'Toyota Yaris sedan in metallic silver with CVT and strong resale value.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Fuel Efficiency', '20+ km/L'],
      ],
      'v60'
    ),
  }),
  vehicle({
    id: 'vehicle-61',
    make: 'Toyota',
    model: 'Yaris',
    trim: 'Sedan',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Black',
    price: 59000,
    description: 'Sleek black Toyota Yaris sedan with efficient 1.5L powertrain.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Fuel Efficiency', '20+ km/L'],
      ],
      'v61'
    ),
  }),
  vehicle({
    id: 'vehicle-62',
    make: 'SEAT',
    model: 'Ibiza',
    trim: 'Reference',
    modelYear: 2026,
    engine: '1.6L I4',
    color: 'Red',
    price: 55000,
    description:
      'European hatchback with lively handling and compact city-friendly size.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Body', 'Hatchback'],
      ],
      'v62'
    ),
  }),
  vehicle({
    id: 'vehicle-63',
    make: 'SEAT',
    model: 'Ibiza',
    trim: 'Style',
    modelYear: 2026,
    engine: '1.6L I4',
    color: 'White',
    price: 56000,
    description:
      'SEAT Ibiza Style hatchback with premium cabin touches and automatic gearbox.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Body', 'Hatchback'],
      ],
      'v63'
    ),
  }),
  vehicle({
    id: 'vehicle-64',
    make: 'SEAT',
    model: 'Ibiza',
    trim: 'Style',
    modelYear: 2026,
    engine: '1.6L I4',
    color: 'Grey',
    price: 59000,
    description:
      'Grey SEAT Ibiza Style — modern hatch with fog lights and power features.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Body', 'Hatchback'],
      ],
      'v64'
    ),
  }),
  vehicle({
    id: 'vehicle-65',
    make: 'Chery',
    model: 'Tiggo 4',
    trim: 'Comfort',
    modelYear: 2026,
    engine: '1.5L Turbo',
    color: 'White',
    price: 62000,
    description:
      'Compact SUV with elevated ride height, turbo engine, and family-friendly space.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'SUV'],
      ],
      'v65'
    ),
  }),
  vehicle({
    id: 'vehicle-66',
    make: 'Chery',
    model: 'Tiggo 4',
    trim: 'Comfort',
    modelYear: 2026,
    engine: '1.5L Turbo',
    color: 'Grey',
    price: 63500,
    description:
      'Chery Tiggo 4 compact SUV in grey — reverse camera, parking sensors, and modern tech.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'SUV'],
      ],
      'v66'
    ),
  }),
  vehicle({
    id: 'vehicle-67',
    make: 'Chery',
    model: 'Tiggo 4',
    trim: 'Luxury',
    modelYear: 2026,
    engine: '1.5L Turbo',
    color: 'Blue',
    price: 65000,
    description:
      'Blue Chery Tiggo 4 Luxury compact SUV with enriched features and turbo performance.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'SUV'],
      ],
      'v67'
    ),
  }),
  vehicle({
    id: 'vehicle-68',
    make: 'Suzuki',
    model: 'Dzire',
    trim: 'GL',
    modelYear: 2026,
    engine: '1.2L I4',
    color: 'White',
    price: 39900,
    description:
      'Ultra-efficient compact sedan ideal for first-time buyers and city driving.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Fuel Efficiency', 'High'],
      ],
      'v68'
    ),
  }),
  vehicle({
    id: 'vehicle-69',
    make: 'Suzuki',
    model: 'Dzire',
    trim: 'GLX',
    modelYear: 2026,
    engine: '1.2L I4',
    color: 'Blue',
    price: 41900,
    description:
      'Suzuki Dzire GLX in blue with upgraded trim and automatic transmission.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Fuel Efficiency', 'High'],
      ],
      'v69'
    ),
  }),
  vehicle({
    id: 'vehicle-70',
    make: 'MG',
    model: 'ZS',
    trim: 'Standard',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'White',
    price: 54900,
    description:
      'Compact MG ZS crossover — stylish SUV stance with sedan-like efficiency.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'Crossover SUV'],
      ],
      'v70'
    ),
  }),
  vehicle({
    id: 'vehicle-71',
    make: 'MG',
    model: 'ZS',
    trim: 'Luxury',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Red',
    price: 56900,
    description:
      'MG ZS Luxury in red with touchscreen infotainment and elevated seating.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'Crossover SUV'],
      ],
      'v71'
    ),
  }),
  vehicle({
    id: 'vehicle-72',
    make: 'Hyundai',
    model: 'Accent',
    trim: 'Smart',
    modelYear: 2026,
    engine: '1.6L I4',
    color: 'Silver',
    price: 59900,
    description:
      'Hyundai Accent Smart — mainstream sedan with warranty confidence and solid features.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Horsepower', '123'],
      ],
      'v72'
    ),
  }),
  vehicle({
    id: 'vehicle-73',
    make: 'Hyundai',
    model: 'Accent',
    trim: 'Comfort',
    modelYear: 2026,
    engine: '1.6L I4',
    color: 'White',
    price: 62900,
    description:
      'White Hyundai Accent Comfort sedan with automatic gearbox and family practicality.',
    attributes: attrs(
      [
        ['Transmission', 'Automatic'],
        ['Seating', '5 Seater'],
        ['Horsepower', '123'],
      ],
      'v73'
    ),
  }),
  vehicle({
    id: 'vehicle-74',
    make: 'Chery',
    model: 'Arrizo 5',
    trim: 'Comfort',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'White',
    price: 53000,
    description:
      'Chery Arrizo 5 Comfort sedan — spacious cabin and competitive equipment list.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'Sedan'],
      ],
      'v74'
    ),
  }),
  vehicle({
    id: 'vehicle-75',
    make: 'Chery',
    model: 'Arrizo 5',
    trim: 'Comfort',
    modelYear: 2026,
    engine: '1.5L I4',
    color: 'Grey',
    price: 54000,
    description:
      'Grey Chery Arrizo 5 Comfort compact sedan for everyday Qatar commuting.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Body', 'Sedan'],
      ],
      'v75'
    ),
  }),
  vehicle({
    id: 'vehicle-76',
    make: 'MG',
    model: '5',
    trim: 'Standard',
    modelYear: 2026,
    engine: '1.5L V4',
    color: 'White',
    price: 42000,
    description:
      'MG 5 sedan in white — stylish compact with CVT and generous trunk space.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Horsepower', '112'],
        ['Trunk Capacity', '512'],
      ],
      'v76'
    ),
  }),
  vehicle({
    id: 'vehicle-77',
    make: 'MG',
    model: '5',
    trim: 'Standard',
    modelYear: 2026,
    engine: '1.5L V4',
    color: 'Blue',
    price: 42500,
    description: 'MG 5 sedan in blue with modern grille and LED lighting.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Horsepower', '112'],
        ['Trunk Capacity', '512'],
      ],
      'v77'
    ),
  }),
  vehicle({
    id: 'vehicle-78',
    make: 'Geely',
    model: 'Emgrand',
    trim: 'GS',
    modelYear: 2026,
    engine: '1.5L',
    color: 'White',
    price: 49900,
    description:
      'Geely Emgrand GS in white — compact sedan with 12.3-inch screen and CVT.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Torque', '142'],
        ['Fuel Tank Capacity', '50L'],
      ],
      'v78'
    ),
  }),
  vehicle({
    id: 'vehicle-79',
    make: 'Geely',
    model: 'Emgrand',
    trim: 'GK',
    modelYear: 2026,
    engine: '1.5L',
    color: 'Black',
    price: 58000,
    description:
      'Geely Emgrand GK in black — higher trim with enriched comfort and safety features.',
    attributes: attrs(
      [
        ['Transmission', 'CVT'],
        ['Seating', '5 Seater'],
        ['Torque', '142'],
        ['Fuel Tank Capacity', '50L'],
      ],
      'v79'
    ),
  }),
];

export function mergeCatalogWithSeed(remote: Product[]): Product[] {
  const byId = new Map<string, Product>();
  for (const v of remote) byId.set(v.id, v);
  for (const v of CATALOG_SEED_VEHICLES) byId.set(v.id, v);
  return Array.from(byId.values());
}
