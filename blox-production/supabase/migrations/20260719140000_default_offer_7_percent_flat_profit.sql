-- New platform default: Standard 7% Flat Profit.
-- Does NOT change offer-1 (9.5%) so existing apps on that offer keep their rate.
-- Does NOT rewrite application schedules or offer_id on historical rows.

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
