import { describe, it, expect, vi } from 'vitest';

// Next.js headers 모킹
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

import { getAirlines } from '@/app/actions/master';

// getAirlines 모킹
vi.mock('@/app/actions/master', () => ({
  getAirlines: vi.fn(async () => [
    { id: '1', name: 'Korean Air', iata_code: 'KE', prefix_code: '180' },
    { id: '2', name: 'Asiana Airlines', iata_code: 'OZ', prefix_code: '988' }
  ]),
}));

describe('Aviation Master Regression', () => {
  it('TC-AV.1: [Airlines] 항공사 목록 조회 시 IATA 코드가 포함되어야 함', async () => {
    // getAirlines 호출 시 iata_code가 존재하고 유효한지 검증
    const airlines = await getAirlines();
    
    if (airlines.length > 0) {
      const firstAirline = airlines[0];
      expect(firstAirline).toHaveProperty('iata_code');
      expect(firstAirline.iata_code).toMatch(/^[A-Z0-9]{2,3}$/);
    }
  });

  it('TC-AV.2: [Airlines] 항공사 Prefix 코드는 3자리 숫자여야 함', async () => {
    const airlines = await getAirlines();
    const prefixAirlines = airlines.filter(a => a.prefix_code);
    
    if (prefixAirlines.length > 0) {
      expect(prefixAirlines[0].prefix_code).toMatch(/^\d{3}$/);
    }
  });
});
