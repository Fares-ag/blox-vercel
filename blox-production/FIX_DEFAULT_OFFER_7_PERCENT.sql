-- Live apply: Standard 7% Flat Profit as sole default.
-- Impact: offers table only (create/update offer-29 + clear other defaults).
-- Existing apps on offer-1 (3 rows as of 2026-07-19) keep offer_id and schedules unchanged.

UPDATE public.offers
SET is_default = false,
    updated_at = now()
WHERE is_default = true
  AND id <> 'offer-29';

INSERT INTO public.offers (
  id,
  name,
  annual_rent_rate,
  annual_rent_rate_funder,
  is_default,
  status,
  is_admin,
  created_at,
  updated_at
)
VALUES (
  'offer-29',
  'Standard 7% Flat Profit',
  7.00,
  0,
  true,
  'active',
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  annual_rent_rate = EXCLUDED.annual_rent_rate,
  annual_rent_rate_funder = EXCLUDED.annual_rent_rate_funder,
  is_default = true,
  status = 'active',
  is_admin = false,
  updated_at = now();

-- Verify
SELECT id, name, annual_rent_rate, is_default, status
FROM public.offers
WHERE id IN ('offer-1', 'offer-29') OR is_default = true
ORDER BY is_default DESC, id;
