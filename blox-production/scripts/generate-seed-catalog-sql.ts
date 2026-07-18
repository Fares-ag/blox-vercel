import { writeFileSync } from 'node:fs';
import { CATALOG_SEED_VEHICLES } from '../packages/customer/src/modules/customer/features/vehicles/data/catalog-seed.ts';

function esc(s: string) {
  return s.replace(/'/g, "''");
}
function j(v: unknown) {
  return `'${esc(JSON.stringify(v))}'::jsonb`;
}

const rows = CATALOG_SEED_VEHICLES.map((v) => {
  return `(
  '${esc(v.id)}',
  '${esc(v.make)}',
  '${esc(v.model)}',
  ${v.trim ? `'${esc(v.trim)}'` : 'NULL'},
  ${v.modelYear},
  '${esc(v.condition)}',
  ${v.engine ? `'${esc(v.engine)}'` : 'NULL'},
  ${v.color ? `'${esc(v.color)}'` : 'NULL'},
  ${v.mileage ?? 0},
  ${v.price},
  '${esc(v.status)}',
  ${j(v.images || [])},
  ${j(v.documents || [])},
  ${j(v.attributes || [])},
  ${v.description ? `'${esc(v.description)}'` : 'NULL'},
  now(),
  now()
)`;
});

const sql = `-- Seed customer catalog vehicles from catalog-seed.ts into products.
-- Idempotent: skip ids that already exist.

INSERT INTO public.products (
  id, make, model, trim, model_year, condition, engine, color, mileage, price,
  status, images, documents, attributes, description, created_at, updated_at
) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`;

writeFileSync('FIX_SEED_CATALOG_PRODUCTS.sql', sql);
console.log(`Wrote FIX_SEED_CATALOG_PRODUCTS.sql with ${CATALOG_SEED_VEHICLES.length} vehicles`);
