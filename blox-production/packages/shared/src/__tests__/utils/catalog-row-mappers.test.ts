import { describe, expect, it } from 'vitest';
import { mapInsuranceRateRow, mapPromotionRow } from '../../utils/catalog-row-mappers';

describe('mapPromotionRow', () => {
  it('maps percentage discount columns to UI fields', () => {
    const promo = mapPromotionRow({
      id: 'p1',
      name: 'Spring',
      description: 'desc',
      discount_percentage: 10,
      discount_amount: null,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(promo.discountType).toBe('percentage');
    expect(promo.discountValue).toBe(10);
    expect(promo.name).toBe('Spring');
  });

  it('maps fixed discount amount columns to UI fields', () => {
    const promo = mapPromotionRow({
      id: 'p2',
      name: 'Fixed',
      description: 'desc',
      discount_percentage: null,
      discount_amount: 500,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(promo.discountType).toBe('fixed');
    expect(promo.discountValue).toBe(500);
  });
});

describe('mapInsuranceRateRow', () => {
  it('maps annual_rate_provider to providerRate', () => {
    const rate = mapInsuranceRateRow({
      id: 'r1',
      name: 'Comp',
      annual_rate: 3.5,
      annual_rate_provider: 1.25,
      coverage_type: 'comprehensive',
      status: 'active',
      is_default: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(rate.annualRate).toBe(3.5);
    expect(rate.providerRate).toBe(1.25);
  });
});
