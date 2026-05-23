import { describe, it, expect } from 'vitest';
import { getSafePostLoginRedirect } from '../authRedirect.util';

describe('getSafePostLoginRedirect', () => {
  it('returns path+search for customer app routes', () => {
    expect(
      getSafePostLoginRedirect({
        pathname: '/customer/applications/new',
        search: '?vehicleId=abc&termMonths=36',
      })
    ).toBe('/customer/applications/new?vehicleId=abc&termMonths=36');
  });

  it('returns undefined for auth routes', () => {
    expect(getSafePostLoginRedirect({ pathname: '/customer/auth/login', search: '' })).toBeUndefined();
  });

  it('returns undefined for non-customer paths', () => {
    expect(getSafePostLoginRedirect({ pathname: '//evil.com', search: '' })).toBeUndefined();
  });

  it('returns undefined for invalid input', () => {
    expect(getSafePostLoginRedirect(null)).toBeUndefined();
    expect(getSafePostLoginRedirect({})).toBeUndefined();
  });
});
