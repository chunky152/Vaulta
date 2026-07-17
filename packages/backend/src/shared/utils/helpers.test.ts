import {
  generateBookingNumber,
  generateReferralCode,
  generateAccessCode,
  generateSlug,
  calculateDistance,
  calculateDuration,
  determinePricingType,
  sanitizeUser,
} from './helpers.js';

describe('generateBookingNumber', () => {
  it('matches the AV-<timestamp>-<hex> format', () => {
    expect(generateBookingNumber()).toMatch(/^AV-[0-9A-Z]+-[0-9A-F]{6}$/);
  });
});

describe('generateReferralCode', () => {
  it('returns an 8-character uppercase hex code', () => {
    expect(generateReferralCode()).toMatch(/^[0-9A-F]{8}$/);
  });
});

describe('generateAccessCode', () => {
  it('returns a 6-digit code', () => {
    expect(generateAccessCode()).toMatch(/^\d{6}$/);
  });
});

describe('generateSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(generateSlug('Unbur Downtown NYC!')).toBe('unbur-downtown-nyc');
  });

  it('collapses whitespace and trims hyphens', () => {
    expect(generateSlug('  --Hello   World--  ')).toBe('hello-world');
  });
});

describe('calculateDistance', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('computes a known distance (NYC to LA ≈ 3936 km)', () => {
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(3970);
  });
});

describe('calculateDuration', () => {
  it('computes hours, days, and months (rounded up)', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T12:00:00Z');
    expect(calculateDuration(start, end)).toEqual({ hours: 36, days: 2, months: 1 });
  });
});

describe('determinePricingType', () => {
  it('uses hourly pricing up to 24 hours', () => {
    expect(determinePricingType(24)).toBe('hourly');
  });

  it('uses daily pricing up to 720 hours', () => {
    expect(determinePricingType(25)).toBe('daily');
    expect(determinePricingType(720)).toBe('daily');
  });

  it('uses monthly pricing beyond 720 hours', () => {
    expect(determinePricingType(721)).toBe('monthly');
  });
});

describe('sanitizeUser', () => {
  it('strips passwordHash and keeps other fields', () => {
    const user = { id: '1', email: 'a@b.c', passwordHash: 'secret' };
    expect(sanitizeUser(user)).toEqual({ id: '1', email: 'a@b.c' });
  });
});
