-- QAuto brand dealers (Audi / Volkswagen / Skoda) + VW inventory import
-- Idempotent: seeds companies, normalizes makes, reassigns ownership, upserts 32 VW SKUs.

-- ── 1) Seed brand dealers under QAuto Group ──────────────────────────────────
INSERT INTO public.companies (id, name, code, description, can_pay, status, metadata, created_at, updated_at)
SELECT gen_random_uuid(), 'Volkswagen', 'VW', 'Volkswagen dealership (QAuto Group)', true, 'active',
       '{"group": "QAuto"}'::jsonb, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Volkswagen');

INSERT INTO public.companies (id, name, code, description, can_pay, status, metadata, created_at, updated_at)
SELECT gen_random_uuid(), 'Skoda', 'SKODA', 'Skoda dealership (QAuto Group)', true, 'active',
       '{"group": "QAuto"}'::jsonb, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Skoda');

UPDATE public.companies
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"group": "QAuto"}'::jsonb,
    description = COALESCE(NULLIF(description, ''), name || ' dealership (QAuto Group)'),
    updated_at = now()
WHERE name IN ('Audi', 'Volkswagen', 'Skoda');

UPDATE public.companies
SET description = COALESCE(NULLIF(description, ''), 'QAuto Group holding / legacy multi-make inventory'),
    updated_at = now()
WHERE name = 'QAuto';

-- ── 2) Normalize make spellings ──────────────────────────────────────────────
UPDATE public.products
SET make = 'Volkswagen', updated_at = now()
WHERE btrim(make) IN ('VW', 'Volkswagon');

UPDATE public.products
SET make = 'Audi', updated_at = now()
WHERE btrim(make) = 'Audi' AND make <> 'Audi';

UPDATE public.products
SET make = 'Skoda', updated_at = now()
WHERE btrim(make) = 'Skoda' AND make <> 'Skoda';

-- ── 3) Reassign existing stock to brand dealers ──────────────────────────────
UPDATE public.products p
SET company_id = c.id, updated_at = now()
FROM public.companies c
WHERE c.name = 'Audi' AND p.make = 'Audi' AND (p.company_id IS DISTINCT FROM c.id);

UPDATE public.products p
SET company_id = c.id, updated_at = now()
FROM public.companies c
WHERE c.name = 'Volkswagen' AND p.make = 'Volkswagen' AND (p.company_id IS DISTINCT FROM c.id);

UPDATE public.products p
SET company_id = c.id, updated_at = now()
FROM public.companies c
WHERE c.name = 'Skoda' AND p.make = 'Skoda' AND (p.company_id IS DISTINCT FROM c.id);

-- ── 4) Import VW price-list SKUs (32 unique / 86 stock units) ────────────────
DO $$
DECLARE
  v_vw uuid;
BEGIN
  SELECT id INTO v_vw FROM public.companies WHERE name = 'Volkswagen' LIMIT 1;
  IF v_vw IS NULL THEN
    RAISE EXCEPTION 'Volkswagen company missing — seed step failed';
  END IF;

  INSERT INTO public.products (
    id, make, model, trim, model_year, condition, engine, color, mileage, price,
    status, images, documents, attributes, description, company_id, created_at, updated_at
  )
  VALUES
('vw-amarok-dc-style-2-3-l-tsi-222-kw-4w-dark-gray-metallic-2025', 'Volkswagen', 'Amarok', 'DC Style 2.3 l TSI 222 KW 4W', 2025, 'new', '2.3 l TSI 222 KW', 'Dark Gray Metallic', 0, 159900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"amarok"},{"id":"sku_key","name":"sku_key","value":"vw-amarok-dc-style-2-3-l-tsi-222-kw-4w-dark-gray-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"257"}]'::jsonb,
      'Amarok DC Style 2.3 l TSI 222 KW 4W', v_vw, now(), now()),
    ('vw-caddy-cargo-1-6-l-81-kw-pfi-pure-gray-2026', 'Volkswagen', 'Caddy', 'Cargo 1.6 l 81 kW PFI', 2026, 'new', '1.6 l 81 kW PFI', 'Pure Gray', 0, 74900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"caddy"},{"id":"sku_key","name":"sku_key","value":"vw-caddy-cargo-1-6-l-81-kw-pfi-pure-gray-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"257"}]'::jsonb,
      'Caddy Cargo 1.6 l 81 kW PFI', v_vw, now(), now()),
    ('vw-caddy-cargo-1-6-l-81-kw-pfi-candy-white-2026', 'Volkswagen', 'Caddy', 'Cargo 1.6 l 81 kW PFI', 2026, 'new', '1.6 l 81 kW PFI', 'Candy White', 0, 74900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"caddy"},{"id":"sku_key","name":"sku_key","value":"vw-caddy-cargo-1-6-l-81-kw-pfi-candy-white-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Caddy Cargo 1.6 l 81 kW PFI', v_vw, now(), now()),
    ('vw-jetta-highline-1-5l-sedan-fwd-pure-white-2026', 'Volkswagen', 'Jetta', 'Highline 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Pure White', 0, 104900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"jetta"},{"id":"sku_key","name":"sku_key","value":"vw-jetta-highline-1-5l-sedan-fwd-pure-white-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"240"}]'::jsonb,
      'Jetta Highline 1.5L Sedan FWD 4Doors', v_vw, now(), now()),
    ('vw-jetta-trendline-1-5l-sedan-fwd-manganese-gray-metallic-2026', 'Volkswagen', 'Jetta', 'Trendline 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Manganese Gray Metallic', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"jetta"},{"id":"sku_key","name":"sku_key","value":"vw-jetta-trendline-1-5l-sedan-fwd-manganese-gray-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"3"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Jetta Trendline 1.5L Sedan FWD 4Doors', v_vw, now(), now()),
    ('vw-jetta-trendline-1-5l-sedan-fwd-gavial-green-metallic-2026', 'Volkswagen', 'Jetta', 'Trendline 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Gavial Green Metallic', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"jetta"},{"id":"sku_key","name":"sku_key","value":"vw-jetta-trendline-1-5l-sedan-fwd-gavial-green-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Jetta Trendline 1.5L Sedan FWD 4Doors', v_vw, now(), now()),
    ('vw-jetta-trendline-1-5l-sedan-fwd-shark-blue-2026', 'Volkswagen', 'Jetta', 'Trendline 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Shark Blue', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"jetta"},{"id":"sku_key","name":"sku_key","value":"vw-jetta-trendline-1-5l-sedan-fwd-shark-blue-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Jetta Trendline 1.5L Sedan FWD 4Doors', v_vw, now(), now()),
    ('vw-passat-a-line-1-5l-sedan-fwd-grenadilla-black-metallic-2026', 'Volkswagen', 'Passat', 'A-Line 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Grenadilla Black Metallic', 0, 104900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"passat"},{"id":"sku_key","name":"sku_key","value":"vw-passat-a-line-1-5l-sedan-fwd-grenadilla-black-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"21"},{"id":"inventory_age_days","name":"inventory_age_days","value":"240"}]'::jsonb,
      'Passat A-Line 1.5L Sedan FWD', v_vw, now(), now()),
    ('vw-passat-a-line-1-5l-sedan-fwd-bamboo-gray-metallic-2026', 'Volkswagen', 'Passat', 'A-Line 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Bamboo Gray Metallic', 0, 104900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"passat"},{"id":"sku_key","name":"sku_key","value":"vw-passat-a-line-1-5l-sedan-fwd-bamboo-gray-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"2"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Passat A-Line 1.5L Sedan FWD', v_vw, now(), now()),
    ('vw-passat-a-line-1-5l-sedan-fwd-silver-leaf-metallic-2026', 'Volkswagen', 'Passat', 'A-Line 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Silver Leaf Metallic', 0, 104900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"passat"},{"id":"sku_key","name":"sku_key","value":"vw-passat-a-line-1-5l-sedan-fwd-silver-leaf-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Passat A-Line 1.5L Sedan FWD', v_vw, now(), now()),
    ('vw-passat-b-line-1-5l-sedan-fwd-deepest-ocean-blue-metallic-2026', 'Volkswagen', 'Passat', 'B-Line 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Deepest Ocean Blue Metallic', 0, 114900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"passat"},{"id":"sku_key","name":"sku_key","value":"vw-passat-b-line-1-5l-sedan-fwd-deepest-ocean-blue-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"2"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Passat B-Line 1.5L Sedan FWD', v_vw, now(), now()),
    ('vw-passat-b-line-1-5l-sedan-fwd-bamboo-gray-metallic-2026', 'Volkswagen', 'Passat', 'B-Line 1.5L Sedan FWD', 2026, 'new', '1.5L', 'Bamboo Gray Metallic', 0, 114900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"passat"},{"id":"sku_key","name":"sku_key","value":"vw-passat-b-line-1-5l-sedan-fwd-bamboo-gray-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"4"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Passat B-Line 1.5L Sedan FWD', v_vw, now(), now()),
    ('vw-t-roc-life-1-4-l-grenadilla-black-metallic-2026', 'Volkswagen', 'T-Roc', 'Life 1.4 L', 2026, 'new', '1.4 L', 'Grenadilla Black Metallic', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"t-roc"},{"id":"sku_key","name":"sku_key","value":"vw-t-roc-life-1-4-l-grenadilla-black-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"3"},{"id":"inventory_age_days","name":"inventory_age_days","value":"286"}]'::jsonb,
      'T-Roc Life 1.4 L', v_vw, now(), now()),
    ('vw-t-roc-life-1-4-l-pure-white-2026', 'Volkswagen', 'T-Roc', 'Life 1.4 L', 2026, 'new', '1.4 L', 'Pure White', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"t-roc"},{"id":"sku_key","name":"sku_key","value":"vw-t-roc-life-1-4-l-pure-white-2026"},{"id":"stock_qty","name":"stock_qty","value":"4"},{"id":"inventory_age_days","name":"inventory_age_days","value":"245"}]'::jsonb,
      'T-Roc Life 1.4 L', v_vw, now(), now()),
    ('vw-t-roc-life-1-4-l-tsi-110-kw-indium-gray-metallic-2025', 'Volkswagen', 'T-Roc', 'Life 1.4 l TSI 110 kW', 2025, 'new', '1.4 l TSI 110 kW', 'Indium Gray Metallic', 0, 89900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"t-roc"},{"id":"sku_key","name":"sku_key","value":"vw-t-roc-life-1-4-l-tsi-110-kw-indium-gray-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"482"}]'::jsonb,
      'T-Roc Life 1.4 l TSI 110 kW (150 PS) 8-speed automatic', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-avocado-green-metallic-2026', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2026, 'new', '2.0L', 'Avocado Green Metallic', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-avocado-green-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"263"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-pure-gray-2026', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2026, 'new', '2.0L', 'Pure Gray', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-pure-gray-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"263"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-avocado-green-metallic-2025', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2025, 'new', '2.0L', 'Avocado Green Metallic', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-avocado-green-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"382"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-silverbird-metallic-2026', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2026, 'new', '2.0L', 'Silverbird Metallic', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-silverbird-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"2"},{"id":"inventory_age_days","name":"inventory_age_days","value":"263"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-pure-gray-2025', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2025, 'new', '2.0L', 'Pure Gray', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-pure-gray-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"340"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-comfortline-2-0l-platinum-gray-metallic-2025', 'Volkswagen', 'Teramont', 'Comfortline 2.0L', 2025, 'new', '2.0L', 'Platinum Gray Metallic', 0, 209900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-comfortline-2-0l-platinum-gray-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"382"}]'::jsonb,
      'Teramont Comfortline 2.0L', v_vw, now(), now()),
    ('vw-teramont-r-line-2-0l-platinum-gray-metallic-2025', 'Volkswagen', 'Teramont', 'R-Line 2.0L', 2025, 'new', '2.0L', 'Platinum Gray Metallic', 0, 259900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-r-line-2-0l-platinum-gray-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"382"}]'::jsonb,
      'Teramont R-Line 2.0L', v_vw, now(), now()),
    ('vw-teramont-r-line-2-0l-pure-gray-2025', 'Volkswagen', 'Teramont', 'R-Line 2.0L', 2025, 'new', '2.0L', 'Pure Gray', 0, 259900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-r-line-2-0l-pure-gray-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"382"}]'::jsonb,
      'Teramont R-Line 2.0L', v_vw, now(), now()),
    ('vw-teramont-trendline-2-0l-silverbird-metallic-2026', 'Volkswagen', 'Teramont', 'Trendline 2.0L', 2026, 'new', '2.0L', 'Silverbird Metallic', 0, 179900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-trendline-2-0l-silverbird-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"263"}]'::jsonb,
      'Teramont Trendline 2.0L', v_vw, now(), now()),
    ('vw-teramont-trendline-2-0l-pure-gray-2026', 'Volkswagen', 'Teramont', 'Trendline 2.0L', 2026, 'new', '2.0L', 'Pure Gray', 0, 179900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-trendline-2-0l-pure-gray-2026"},{"id":"stock_qty","name":"stock_qty","value":"2"},{"id":"inventory_age_days","name":"inventory_age_days","value":"263"}]'::jsonb,
      'Teramont Trendline 2.0L', v_vw, now(), now()),
    ('vw-teramont-trendline-2-0l-pure-gray-2025', 'Volkswagen', 'Teramont', 'Trendline 2.0L', 2025, 'new', '2.0L', 'Pure Gray', 0, 179900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"teramont"},{"id":"sku_key","name":"sku_key","value":"vw-teramont-trendline-2-0l-pure-gray-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"340"}]'::jsonb,
      'Teramont Trendline 2.0L', v_vw, now(), now()),
    ('vw-tiguan-elegance-1-4-i-tsi-oyster-silver-metallic-2025', 'Volkswagen', 'Tiguan', 'Elegance 1.4 I TSI', 2025, 'new', '1.4 I TSI', 'Oyster Silver Metallic', 0, 169900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-elegance-1-4-i-tsi-oyster-silver-metallic-2025"},{"id":"stock_qty","name":"stock_qty","value":"1"},{"id":"inventory_age_days","name":"inventory_age_days","value":"312"}]'::jsonb,
      'Tiguan Elegance 1.4 I TSI', v_vw, now(), now()),
    ('vw-tiguan-life-1-4-i-tsi-pure-white-2026', 'Volkswagen', 'Tiguan', 'Life 1.4 I TSI', 2026, 'new', '1.4 I TSI', 'Pure White', 0, 119900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-life-1-4-i-tsi-pure-white-2026"},{"id":"stock_qty","name":"stock_qty","value":"7"},{"id":"inventory_age_days","name":"inventory_age_days","value":"214"}]'::jsonb,
      'Tiguan Life 1.4 I TSI', v_vw, now(), now()),
    ('vw-tiguan-life-1-4-i-tsi-dolphin-gray-metallic-2026', 'Volkswagen', 'Tiguan', 'Life 1.4 I TSI', 2026, 'new', '1.4 I TSI', 'Dolphin Gray Metallic', 0, 119900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-life-1-4-i-tsi-dolphin-gray-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"5"},{"id":"inventory_age_days","name":"inventory_age_days","value":"236"}]'::jsonb,
      'Tiguan Life 1.4 I TSI', v_vw, now(), now()),
    ('vw-tiguan-life-1-4-i-tsi-nightshade-blue-metallic-2026', 'Volkswagen', 'Tiguan', 'Life 1.4 I TSI', 2026, 'new', '1.4 I TSI', 'Nightshade Blue Metallic', 0, 119900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-life-1-4-i-tsi-nightshade-blue-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"7"},{"id":"inventory_age_days","name":"inventory_age_days","value":"236"}]'::jsonb,
      'Tiguan Life 1.4 I TSI', v_vw, now(), now()),
    ('vw-tiguan-life-1-4-i-tsi-cipressino-green-metallic-2026', 'Volkswagen', 'Tiguan', 'Life 1.4 I TSI', 2026, 'new', '1.4 I TSI', 'Cipressino-Green Metallic', 0, 119900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-life-1-4-i-tsi-cipressino-green-metallic-2026"},{"id":"stock_qty","name":"stock_qty","value":"2"},{"id":"inventory_age_days","name":"inventory_age_days","value":"257"}]'::jsonb,
      'Tiguan Life 1.4 I TSI', v_vw, now(), now()),
    ('vw-tiguan-life-1-4-i-tsi-urano-gray-2026', 'Volkswagen', 'Tiguan', 'Life 1.4 I TSI', 2026, 'new', '1.4 I TSI', 'Urano Gray', 0, 119900, 'active',
      '[]'::jsonb, '[]'::jsonb,
      '[{"id":"model_family_key","name":"model_family_key","value":"tiguan"},{"id":"sku_key","name":"sku_key","value":"vw-tiguan-life-1-4-i-tsi-urano-gray-2026"},{"id":"stock_qty","name":"stock_qty","value":"4"},{"id":"inventory_age_days","name":"inventory_age_days","value":"236"}]'::jsonb,
      'Tiguan Life 1.4 I TSI', v_vw, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    make = EXCLUDED.make,
    model = EXCLUDED.model,
    trim = EXCLUDED.trim,
    model_year = EXCLUDED.model_year,
    condition = EXCLUDED.condition,
    engine = EXCLUDED.engine,
    color = EXCLUDED.color,
    price = EXCLUDED.price,
    status = EXCLUDED.status,
    images = EXCLUDED.images,
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description,
    company_id = EXCLUDED.company_id,
    updated_at = now();
END $$;
